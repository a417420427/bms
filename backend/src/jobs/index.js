const cron = require("node-cron");
const Customer = require("../models/Customer");
const ExpiredPool = require("../models/ExpiredPool");
const PublicPool = require("../models/PublicPool");
const SystemConfig = require("../models/SystemConfig");
const logger = require("../utils/logger");
const { writeAudit } = require("../utils/audit");
const { writeTransferLog } = require("../utils/transferLog");
const { AUDIT_ACTION, TRANSFER_ACTION, CUSTOMER_STATUS } = require("../utils/constants");

// 渠道24小时过期检查任务：每 10 分钟扫描一次
// 把 channelExpireAt 已过期且仍是 UNVISITED 状态的客户移入过期池
cron.schedule("*/10 * * * *", async () => {
  try {
    const now = new Date();
    const customers = await Customer.find({
      status: CUSTOMER_STATUS.UNVISITED,
      channelExpireAt: { $lt: now },
    }).lean();

    if (!customers.length) return;

    for (const c of customers) {
      const expired = await ExpiredPool.create({
        customerId: c._id,
        projectId: c.projectId,
        channelUser: c.channelUser,
        company: c.company,
        referrerName: c.referrerName,
        source: c.source,
        expiredAt: now,
      });

      await Customer.updateOne({ _id: c._id }, { $set: { status: CUSTOMER_STATUS.EXPIRED, channelExpireAt: null } });

      await writeTransferLog({
        customerId: c._id,
        projectId: c.projectId,
        customerName: c.name,
        action: TRANSFER_ACTION.EXPIRE,
        reason: "渠道24小时未到访自动过期",
      });

      await writeAudit({
        action: AUDIT_ACTION.CHANNEL_EXPIRE,
        module: "JOB",
        target: c.name,
        projectId: c.projectId,
        detail: { customerId: c._id, expiredPoolId: expired._id },
      });
    }

    logger.info(`[job] channelExpiration: ${customers.length} customers expired`);
  } catch (e) {
    logger.error(`[job] channelExpiration failed: ${e.message}`);
  }
});

// 客户30天无跟进移入公共池任务：每天凌晨 02:00 执行
cron.schedule("0 2 * * *", async () => {
  try {
    const configs = await SystemConfig.find().lean();
    for (const cfg of configs) {
      const days = cfg.publicPoolRetentionDays || 30;
      const threshold = new Date(Date.now() - days * 86400 * 1000);

      const filter = {
        status: CUSTOMER_STATUS.ACTIVE,
        lastFollowupAt: { $lt: threshold },
      };
      if (cfg.projectId) filter.projectId = cfg.projectId;

      const customers = await Customer.find(filter).lean();
      for (const c of customers) {
        await PublicPool.create({
          customerId: c._id,
          projectId: c.projectId,
          reason: `${days}天无跟进自动入公共池`,
          previousOwner: c.owner,
        });

        await Customer.updateOne({ _id: c._id }, { $set: { status: CUSTOMER_STATUS.PUBLIC_POOL, owner: null } });

        await writeTransferLog({
          customerId: c._id,
          projectId: c.projectId,
          customerName: c.name,
          fromUser: c.owner,
          action: TRANSFER_ACTION.MOVE_PUBLIC,
          reason: `${days}天无跟进自动入公共池`,
        });

        await writeAudit({
          action: AUDIT_ACTION.MOVE_PUBLIC,
          module: "JOB",
          target: c.name,
          projectId: c.projectId,
          detail: { customerId: c._id, days },
        });
      }
    }
    logger.info("[job] publicPoolRetention: scan done");
  } catch (e) {
    logger.error(`[job] publicPoolRetention failed: ${e.message}`);
  }
});

module.exports = {
  start: () => logger.info("[jobs] scheduled tasks started"),
};
