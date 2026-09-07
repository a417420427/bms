const TransferLog = require("../models/TransferLog");
const logger = require("./logger");

async function writeTransferLog({ customerId, projectId, customerName, fromUser, fromUserName, toUser, toUserName, action, reason, operator, operatorName }) {
  try {
    await TransferLog.create({
      customerId,
      projectId,
      customerName,
      fromUser: fromUser || null,
      fromUserName: fromUserName || "",
      toUser: toUser || null,
      toUserName: toUserName || "",
      action,
      reason: reason || "",
      operator: operator || null,
      operatorName: operatorName || "",
    });
  } catch (e) {
    logger.error(`[transferLog] write failed: ${e.message}`);
  }
}

module.exports = { writeTransferLog };
