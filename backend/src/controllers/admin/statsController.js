const Customer = require("../../models/Customer");
const ExpiredPool = require("../../models/ExpiredPool");
const Followup = require("../../models/Followup");
const AuditLog = require("../../models/AuditLog");
const SystemConfig = require("../../models/SystemConfig");
const config = require("../../config");
const { CUSTOMER_SOURCE, CUSTOMER_STATUS, AUDIT_ACTION } = require("../../utils/constants");

// 数据看板统计接口（GET /api/admin/stats/*）
// 与其他 admin controller 一致：通过 req.projectContext 构造项目过滤条件
function buildProjectFilter(ctx) {
  return ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };
}

// 读取预警天数（项目级配置优先，退回全局，再退回 config.business / 30）
async function getReminderDays(projectId) {
  const sysCfg =
    (await SystemConfig.findOne({ projectId: { $in: [projectId, null] } }).sort({ projectId: -1 })) ||
    {};
  return sysCfg.followupReminderDays ?? config.business.followupReminderDays ?? 30;
}

// GET /api/admin/stats/funnel?startTime=&endTime=
// 客户漏斗：报备 → 到访 → 跟进 → 成交
exports.funnel = async (req, res) => {
  const ctx = req.projectContext;
  const projectFilter = buildProjectFilter(ctx);

  const start = req.query.startTime ? new Date(req.query.startTime) : new Date(Date.now() - 30 * 86400 * 1000);
  const end = req.query.endTime ? new Date(req.query.endTime) : new Date();
  const rangeFilter = { ...projectFilter, createdAt: { $gte: start, $lte: end } };

  const [reported, visited, followed, deal] = await Promise.all([
    Customer.countDocuments(rangeFilter),
    Customer.countDocuments({ ...rangeFilter, visitTime: { $ne: null } }),
    Customer.countDocuments({ ...rangeFilter, followupCount: { $gt: 0 } }),
    Customer.countDocuments({ ...rangeFilter, status: CUSTOMER_STATUS.DEAL }),
  ]);

  return {
    data: {
      funnel: [
        { name: "报备客户", value: reported },
        { name: "到访客户", value: visited },
        { name: "有效跟进", value: followed },
        { name: "成交客户", value: deal },
      ],
      startTime: start,
      endTime: end,
    },
  };
};

// GET /api/admin/stats/sales
// 销售员业绩：客户数 / 到访数 / 成交数 / 跟进及时率（未超期客户占比）
exports.sales = async (req, res) => {
  const ctx = req.projectContext;
  const projectFilter = buildProjectFilter(ctx);

  const days = await getReminderDays(ctx.projectId);
  const cutoff = new Date(Date.now() - days * 86400 * 1000);

  const [byOwner, overdueByOwner] = await Promise.all([
    Customer.aggregate([
      { $match: { ...projectFilter, owner: { $ne: null } } },
      {
        $group: {
          _id: "$owner",
          customerCount: { $sum: 1 },
          visitCount: { $sum: { $cond: [{ $ifNull: ["$visitTime", false] }, 1, 0] } },
          dealCount: { $sum: { $cond: [{ $eq: ["$status", CUSTOMER_STATUS.DEAL] }, 1, 0] } },
        },
      },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      {
        $project: {
          _id: 1,
          name: "$user.realName",
          username: "$user.username",
          customerCount: 1,
          visitCount: 1,
          dealCount: 1,
        },
      },
    ]),
    Customer.aggregate([
      {
        $match: {
          ...projectFilter,
          owner: { $ne: null },
          status: { $ne: CUSTOMER_STATUS.DEAL },
          $or: [
            { lastFollowupAt: { $lt: cutoff } },
            { lastFollowupAt: null, createdAt: { $lt: cutoff } },
          ],
        },
      },
      { $group: { _id: "$owner", overdueCount: { $sum: 1 } } },
    ]),
  ]);

  const overdueMap = new Map(overdueByOwner.map((r) => [r._id.toString(), r.overdueCount]));
  const list = byOwner
    .map((r) => {
      const overdue = overdueMap.get(r._id.toString()) || 0;
      const inTime = Math.max(r.customerCount - r.dealCount - overdue, 0);
      const denominator = r.customerCount - r.dealCount;
      return {
        userId: r._id,
        name: r.name || r.username,
        customerCount: r.customerCount,
        visitCount: r.visitCount,
        dealCount: r.dealCount,
        followupRate: denominator > 0 ? Math.round((inTime / denominator) * 100) : 100,
      };
    })
    .sort((a, b) => b.customerCount - a.customerCount);

  return { data: { list, reminderDays: days } };
};

// GET /api/admin/stats/channel
// 渠道贡献：合作公司推荐量/到访率/过期率 + 渠道员推荐 Top 榜
exports.channel = async (req, res) => {
  const ctx = req.projectContext;
  const projectFilter = buildProjectFilter(ctx);
  const channelFilter = { ...projectFilter, source: CUSTOMER_SOURCE.CHANNEL_COMPANY };

  const [byCompany, expiredByCompany, byChannelUser] = await Promise.all([
    Customer.aggregate([
      { $match: channelFilter },
      {
        $group: {
          _id: "$company",
          recommendCount: { $sum: 1 },
          visitCount: { $sum: { $cond: [{ $ifNull: ["$visitTime", false] }, 1, 0] } },
        },
      },
      { $lookup: { from: "companies", localField: "_id", foreignField: "_id", as: "company" } },
      { $unwind: { path: "$company", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$company.name", "未知公司"] },
          recommendCount: 1,
          visitCount: 1,
        },
      },
    ]),
    ExpiredPool.aggregate([
      { $match: { ...projectFilter, archived: { $ne: true } } },
      { $group: { _id: "$company", expiredCount: { $sum: 1 } } },
    ]),
    Customer.aggregate([
      { $match: { ...channelFilter, channelUser: { $ne: null } } },
      {
        $group: {
          _id: { user: "$channelUser", company: "$company" },
          recommendCount: { $sum: 1 },
          visitCount: { $sum: { $cond: [{ $ifNull: ["$visitTime", false] }, 1, 0] } },
        },
      },
      { $lookup: { from: "users", localField: "_id.user", foreignField: "_id", as: "user" } },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$user.realName", "$user.username", "未知渠道员"] },
          company: "$_id.company",
          recommendCount: 1,
          visitCount: 1,
        },
      },
      { $sort: { recommendCount: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const expiredMap = new Map(
    expiredByCompany.filter((r) => r._id).map((r) => [r._id.toString(), r.expiredCount])
  );

  const companies = byCompany.map((r) => {
    const expired = expiredMap.get(r._id && r._id.toString()) || 0;
    return {
      companyId: r._id,
      name: r.name,
      recommendCount: r.recommendCount,
      visitRate: r.recommendCount ? Math.round((r.visitCount / r.recommendCount) * 100) : 0,
      expireRate: r.recommendCount ? Math.round((expired / r.recommendCount) * 100) : 0,
    };
  });

  const topUsers = byChannelUser.map((r) => ({
    userId: r._id.user,
    name: r.name,
    recommendCount: r.recommendCount,
    visitRate: r.recommendCount ? Math.round((r.visitCount / r.recommendCount) * 100) : 0,
  }));

  return { data: { companies, topUsers } };
};

// GET /api/admin/stats/warning
// 跟进预警：即将满 N 天未跟进客户，按销售员聚合 + 按意向等级分布
exports.warning = async (req, res) => {
  const ctx = req.projectContext;
  const projectFilter = buildProjectFilter(ctx);

  const days = await getReminderDays(ctx.projectId);
  const cutoff = new Date(Date.now() - days * 86400 * 1000);

  const match = {
    ...projectFilter,
    status: CUSTOMER_STATUS.ACTIVE,
    owner: { $ne: null },
    $or: [
      { lastFollowupAt: { $lt: cutoff } },
      { lastFollowupAt: null, createdAt: { $lt: cutoff } },
    ],
  };

  const [byOwner, byIntent] = await Promise.all([
    Customer.aggregate([
      { $match: match },
      { $group: { _id: "$owner", warningCount: { $sum: 1 } } },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          name: { $ifNull: ["$user.realName", "$user.username", "未知销售员"] },
          warningCount: 1,
        },
      },
      { $sort: { warningCount: -1 } },
    ]),
    Customer.aggregate([
      { $match: match },
      { $group: { _id: "$intentLevel", warningCount: { $sum: 1 } } },
    ]),
  ]);

  return {
    data: {
      reminderDays: days,
      bySalesman: byOwner.map((r) => ({ userId: r._id, name: r.name, warningCount: r.warningCount })),
      byIntent: byIntent.map((r) => ({ intentLevel: r._id || "NONE", warningCount: r.warningCount })),
      total: byOwner.reduce((s, r) => s + r.warningCount, 0),
    },
  };
};

// GET /api/admin/stats/activity
// 实时动态：今日新增/到访/跟进/审批计数 + 最近操作动态流
exports.activity = async (req, res) => {
  const ctx = req.projectContext;
  const projectFilter = buildProjectFilter(ctx);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const auditFilter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };

  const [created, arrived, followed, approved, activities] = await Promise.all([
    Customer.countDocuments({ ...projectFilter, createdAt: { $gte: todayStart } }),
    Customer.countDocuments({ ...projectFilter, visitTime: { $gte: todayStart } }),
    Followup.countDocuments({ ...projectFilter, followupTime: { $gte: todayStart } }),
    AuditLog.countDocuments({ ...auditFilter, action: AUDIT_ACTION.APPROVE, createdAt: { $gte: todayStart } }),
    AuditLog.find(auditFilter)
      .sort({ createdAt: -1 })
      .limit(50)
      .select("operatorName action module target createdAt")
      .lean(),
  ]);

  return {
    data: {
      stats: { created, arrived, followed, approved },
      activities: activities.map((log) => ({
        id: log._id,
        time: log.createdAt,
        action: log.action,
        content: [log.operatorName, log.target || log.module].filter(Boolean).join(" · "),
      })),
    },
  };
};
