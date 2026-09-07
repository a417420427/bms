const PublicPool = require("../../models/PublicPool");
const Customer = require("../../models/Customer");
const { BizError } = require("../../utils/response");
const { parsePaging } = require("../../utils/validators");
const { writeAudit } = require("../../utils/audit");
const { writeTransferLog } = require("../../utils/transferLog");
const { AUDIT_ACTION, TRANSFER_ACTION, CUSTOMER_STATUS } = require("../../utils/constants");
const mongoose = require("mongoose");
const User = require("../../models/User");

// GET /api/admin/public-pool
exports.list = async (req, res) => {
  const ctx = req.projectContext;
  const projectFilter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };
  const { page, pageSize, skip } = parsePaging(req.query);
  const { keyword } = req.query;

  const filter = { ...projectFilter, archived: { $ne: true } };
  if (keyword) {
    const customers = await Customer.find({ name: new RegExp(keyword, "i") }, "_id").lean();
    filter.customerId = { $in: customers.map((c) => c._id) };
  }

  const [list, total] = await Promise.all([
    PublicPool.find(filter)
      .populate({
        path: "customerId",
        select: "name phone source intentLevel status visitTime owner company",
        populate: [{ path: "owner", select: "realName username" }, { path: "company", select: "name" }],
      })
      .populate("previousOwner", "realName username")
      .sort({ releasedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    PublicPool.countDocuments(filter),
  ]);

  const out = list.map((p) => ({
    _id: p._id,
    customer: p.customerId,
    customerId: p.customerId?._id,
    reason: p.reason,
    releasedAt: p.releasedAt,
    pendingApprovalId: p.pendingApprovalId,
  }));

  return { data: { list: out, total, page, pageSize } };
};

// POST /api/admin/assign-from-public
// 直接从公共池分配客户给销售员/渠道员
exports.assignFromPublic = async (req, res) => {
  const { publicPoolId, targetUserId } = req.body || {};
  if (!publicPoolId || !targetUserId) throw new BizError("参数不完整", 400);

  const ctx = req.projectContext;
  const projectFilter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };

  const pool = await PublicPool.findOne({ _id: publicPoolId, ...projectFilter });
  if (!pool) throw new BizError("公共池中无此客户", 404);

  const customer = await Customer.findById(pool.customerId);
  if (!customer) throw new BizError("客户记录不存在", 404);

  const target = await User.findOne({ _id: targetUserId, accessibleProjects: customer.projectId });
  if (!target) throw new BizError("目标用户不存在或无该项目权限", 404);
  if (target.role === "ROLE_ADMIN") throw new BizError("不能分配给管理员", 400);

  customer.owner = target._id;
  customer.status = CUSTOMER_STATUS.ACTIVE;
  customer.lastFollowupAt = new Date();
  await customer.save();

  pool.archived = true;
  pool.pendingApprovalId = null;
  await pool.save();

  await writeTransferLog({
    customerId: customer._id,
    projectId: customer.projectId,
    customerName: customer.name,
    fromUser: pool.previousOwner,
    toUser: target._id,
    toUserName: target.realName || target.username,
    action: TRANSFER_ACTION.ASSIGN,
    reason: "管理员从公共池手动分配",
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
  });

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CUSTOMER_ASSIGN,
    module: "ADMIN",
    target: customer.name,
    projectId: customer.projectId,
    detail: { publicPoolId, customerId: customer._id, targetUserId: target._id },
    ip: req.ip,
  });

  return { data: { customer, message: "客户已从公共池分配" } };
};
