const Customer = require("../../models/Customer");
const Approval = require("../../models/Approval");
const SystemConfig = require("../../models/SystemConfig");
const { APPROVAL_RESULT } = require("../../models/Approval");
const config = require("../../config");

// GET /api/sales/dashboard
// 返回：我的客户总数 / 待跟进 / 30天未跟进预警 / 已成交 / 未到访申领池数量
exports.dashboard = async (req, res) => {
  const { projectId } = req.projectContext;
  const owner = req.user._id;

  const sysCfg = (await SystemConfig.findOne({ projectId: { $in: [projectId, null] } }).sort({ projectId: -1 })) || {};
  const reminderDays = sysCfg.followupReminderDays ?? config.business.followupReminderDays;
  const reminderThreshold = new Date(Date.now() - reminderDays * 86400 * 1000);

  const [total, pending, expired, deal, unvisited] = await Promise.all([
    Customer.countDocuments({ projectId, owner, status: { $in: ["ACTIVE", "DEAL"] } }),
    Customer.countDocuments({ projectId, owner, status: "ACTIVE" }),
    Customer.countDocuments({
      projectId,
      owner,
      status: "ACTIVE",
      lastFollowupAt: { $lt: reminderThreshold },
    }),
    Customer.countDocuments({ projectId, owner, status: "DEAL" }),
    Customer.countDocuments({ projectId, status: "UNVISITED" }),
  ]);

  return {
    data: {
      total,
      pending,
      reminder30: expired,
      deal,
      unvisitedPoolCount: unvisited,
    },
  };
};
