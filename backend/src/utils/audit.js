const AuditLog = require("../models/AuditLog");
const logger = require("./logger");

// 写入审计日志（非阻塞，失败仅记日志不抛出）
async function writeAudit({ operator, operatorName, action, module, target, projectId, detail, ip }) {
  try {
    await AuditLog.create({
      operator: operator || null,
      operatorName: operatorName || "",
      action,
      module: module || action,
      target: target || "",
      projectId: projectId || null,
      detail: detail || null,
      ip: ip || "",
    });
  } catch (e) {
    logger.error(`[audit] write failed: ${e.message}`);
  }
}

module.exports = { writeAudit };
