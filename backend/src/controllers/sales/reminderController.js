const Customer = require("../../models/Customer");
const SystemConfig = require("../../models/SystemConfig");
const config = require("../../config");

// GET /api/sales/followup-reminder
// 即将满30天未跟进的客户（红色预警）
exports.reminder = async (req, res) => {
  const { projectId } = req.projectContext;
  const owner = req.user._id;

  const sysCfg = (await SystemConfig.findOne({ projectId: { $in: [projectId, null] } }).sort({ projectId: -1 })) || {};
  const reminderDays = sysCfg.followupReminderDays ?? config.business.followupReminderDays;
  const threshold = new Date(Date.now() - reminderDays * 86400 * 1000);

  const list = await Customer.find({
    projectId,
    owner,
    status: "ACTIVE",
    lastFollowupAt: { $lt: threshold },
  })
    .populate("owner", "realName username phone")
    .sort({ lastFollowupAt: 1 })
    .lean();

  return { data: list };
};
