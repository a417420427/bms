const SystemConfig = require("../../models/SystemConfig");
const { BizError } = require("../../utils/response");
const { writeAudit } = require("../../utils/audit");
const { AUDIT_ACTION } = require("../../utils/constants");

// GET /api/admin/config?projectId=
// 不传 projectId 返回全局默认配置
exports.get = async (req, res) => {
  const { projectId } = req.query || {};
  let cfg = null;
  if (projectId) {
    cfg = await SystemConfig.findOne({ projectId });
  }
  if (!cfg) {
    // 退回全局配置
    cfg = await SystemConfig.findOne({ projectId: null });
  }
  return { data: cfg || (await SystemConfig.create({ projectId: null })) };
};

// PUT /api/admin/config
exports.update = async (req, res) => {
  const { projectId, ...rest } = req.body || {};
  const allowed = [
    "visitMaxOffsetHours",
    "channelMaxOffsetHours",
    "followupReminderDays",
    "publicPoolRetentionDays",
    "channelExpireHours",
    "expiredPoolRetentionDays",
  ];
  const update = {};
  allowed.forEach((k) => {
    if (k in rest) update[k] = rest[k];
  });

  let cfg;
  if (projectId) {
    cfg = await SystemConfig.findOneAndUpdate(
      { projectId },
      { $set: update },
      { new: true, upsert: true }
    );
  } else {
    cfg = await SystemConfig.findOneAndUpdate(
      { projectId: null },
      { $set: update },
      { new: true, upsert: true }
    );
  }

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CONFIG_UPDATE,
    module: "ADMIN",
    target: "系统配置",
    projectId: projectId || null,
    detail: { update },
    ip: req.ip,
  });

  return { data: cfg };
};
