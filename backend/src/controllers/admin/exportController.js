const ExcelJS = require("exceljs");
const Customer = require("../../models/Customer");
const { writeAudit } = require("../../utils/audit");
const { AUDIT_ACTION } = require("../../utils/constants");
const config = require("../../config");

// POST /api/admin/export-customers
// 导出 Excel，强制记录导出日志
exports.exportCustomers = async (req, res) => {
  const ctx = req.projectContext;
  const { projectId, source, owner, intentLevel, status, startDate, endDate } = req.body || {};

  const filter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };

  if (projectId) filter.projectId = projectId;
  if (source) filter.source = source;
  if (owner) filter.owner = owner;
  if (intentLevel) filter.intentLevel = intentLevel;
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const customers = await Customer.find(filter)
    .populate("owner", "realName username phone")
    .populate("channelUser", "realName username")
    .populate("company", "name")
    .populate("projectId", "name")
    .lean();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("客户列表");
  ws.columns = [
    { header: "客户姓名", key: "name", width: 18 },
    { header: "手机号", key: "phone", width: 16 },
    { header: "来源类型", key: "source", width: 16 },
    { header: "意向等级", key: "intentLevel", width: 12 },
    { header: "客户状态", key: "status", width: 12 },
    { header: "到访时间", key: "visitTime", width: 20 },
    { header: "归属销售", key: "ownerName", width: 14 },
    { header: "渠道员", key: "channelName", width: 14 },
    { header: "合作公司", key: "companyName", width: 18 },
    { header: "项目", key: "projectName", width: 18 },
    { header: "最近跟进", key: "lastFollowupAt", width: 20 },
    { header: "备注", key: "remark", width: 24 },
  ];

  customers.forEach((c) => {
    ws.addRow({
      name: c.name,
      phone: c.rawPhone || c.phone,
      source: c.source,
      intentLevel: c.intentLevel,
      status: c.status,
      visitTime: c.visitTime ? new Date(c.visitTime).toLocaleString("zh-CN", { hour12: false }) : "",
      ownerName: c.owner?.realName || c.owner?.username || "",
      channelName: c.channelUser?.realName || c.channelUser?.username || "",
      companyName: c.company?.name || "",
      projectName: c.projectId?.name || "",
      lastFollowupAt: c.lastFollowupAt ? new Date(c.lastFollowupAt).toLocaleString("zh-CN", { hour12: false }) : "",
      remark: c.remark || "",
    });
  });

  const buffer = await wb.xlsx.writeBuffer();

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.EXPORT,
    module: "ADMIN",
    target: "客户列表",
    projectId: projectId || null,
    detail: { filter, count: customers.length },
    ip: req.ip,
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="customers_${Date.now()}.xlsx"`);
  return res.send(Buffer.from(buffer));
};
