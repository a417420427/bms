const AuditLog = require("../../models/AuditLog");
const { parsePaging } = require("../../utils/validators");

// GET /api/admin/audit-logs
// 筛选：项目、操作人员、时间范围、动作类型
exports.list = async (req, res) => {
  const { page, pageSize, skip } = parsePaging(req.query);
  const { projectId, operator, action, startDate, endDate, keyword } = req.query;

  const filter = {};
  if (projectId) filter.projectId = projectId;
  if (operator) filter.operator = operator;
  if (action) filter.action = action;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  if (keyword) {
    filter.$or = [
      { action: new RegExp(keyword, "i") },
      { target: new RegExp(keyword, "i") },
      { operatorName: new RegExp(keyword, "i") },
    ];
  }

  const [list, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("operator", "realName username")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { data: { list, total, page, pageSize } };
};
