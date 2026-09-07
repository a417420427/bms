const Customer = require("../../models/Customer");
const ExpiredPool = require("../../models/ExpiredPool");

// GET /api/channel/dashboard
// 返回：推荐总数 / 已到访 / 未到访 / 过期池数量
exports.dashboard = async (req, res) => {
  const { projectId } = req.projectContext;
  const channelUser = req.user._id;

  const [total, visited, unvisited, expired] = await Promise.all([
    Customer.countDocuments({ projectId, channelUser }),
    Customer.countDocuments({ projectId, channelUser, status: { $in: ["ACTIVE", "DEAL"] } }),
    Customer.countDocuments({ projectId, channelUser, status: "UNVISITED" }),
    ExpiredPool.countDocuments({ projectId, channelUser, archived: { $ne: true } }),
  ]);

  return { data: { total, visited, unvisited, expired } };
};
