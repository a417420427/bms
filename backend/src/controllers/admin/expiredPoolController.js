const ExpiredPool = require("../../models/ExpiredPool");
const { parsePaging } = require("../../utils/validators");

// GET /api/admin/expired-pool
// 管理员仅查看，不能编辑
exports.list = async (req, res) => {
  const ctx = req.projectContext;
  const projectFilter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };
  const { page, pageSize, skip } = parsePaging(req.query);
  const { keyword, channelUser } = req.query;

  const filter = { ...projectFilter, archived: { $ne: true } };
  if (channelUser) filter.channelUser = channelUser;
  if (keyword) {
    filter.$or = [
      { companyName: new RegExp(keyword, "i") },
      { referrerName: new RegExp(keyword, "i") },
    ];
  }

  const [list, total] = await Promise.all([
    ExpiredPool.find(filter)
      .populate({
        path: "customerId",
        select: "name phone source status visitTime company referrerName channelUser",
      })
      .populate("channelUser", "realName username")
      .populate("company", "name")
      .sort({ expiredAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    ExpiredPool.countDocuments(filter),
  ]);

  return { data: { list, total, page, pageSize } };
};
