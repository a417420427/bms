const mongoose = require("mongoose");
const CheckIn = require("../../models/CheckIn");
const { parsePaging } = require("../../utils/validators");

// GET /api/admin/checkins
// 入参: page, pageSize, projectId, userId, startDate, endDate
exports.list = async (req, res) => {
  const { page, pageSize, skip } = parsePaging(req.query);
  const { projectId, userId, startDate, endDate } = req.query;

  const filter = {};
  if (projectId && mongoose.isValidObjectId(projectId)) filter.projectId = projectId;
  if (userId && mongoose.isValidObjectId(userId)) filter.userId = userId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate + "T23:59:59.999Z");
  }

  // 管理员仅可查看自己可访问项目
  const accessibleIds = (req.user.accessibleProjects || []).map((p) => p._id || p);
  if (accessibleIds.length) {
    filter.projectId = { $in: accessibleIds, ...(filter.projectId ? { $eq: filter.projectId } : {}) };
  }

  const [list, total] = await Promise.all([
    CheckIn.find(filter)
      .populate("userId", "realName username role")
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    CheckIn.countDocuments(filter),
  ]);

  return { data: { list, total, page, pageSize } };
};
