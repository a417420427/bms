const mongoose = require("mongoose");
const Project = require("../models/Project");
const User = require("../models/User");
const { BizError } = require("../utils/response");
const { ROLE } = require("../utils/constants");
const { serializeUser } = require("./authController");

// GET /api/user/projects - 当前账号可访问项目列表
exports.listProjects = async (req, res) => {
  const ids = (req.user.accessibleProjects || []).map((p) => p._id || p);
  if (!ids.length) return { data: [] };
  const projects = await Project.find({ _id: { $in: ids }, status: "ACTIVE" }).lean();
  const currentId = req.user.currentProject?._id?.toString() || req.user.currentProject?.toString?.();
  const list = projects.map((p) => ({
    _id: p._id,
    name: p.name,
    code: p.code,
    address: p.address,
    developer: p.developer,
    isDefault: currentId && p._id.toString() === currentId,
  }));
  return { data: list };
};

// POST /api/user/switch-project - 切换当前会话项目
exports.switchProject = async (req, res) => {
  const { projectId } = req.body || {};
  if (!projectId || !mongoose.isValidObjectId(projectId)) {
    throw new BizError("projectId 无效", 400);
  }
  const hasAccess = (req.user.accessibleProjects || []).some(
    (p) => (p._id || p).toString() === projectId
  );
  if (!hasAccess) throw new BizError("无权访问该项目", 403);

  const project = await Project.findById(projectId).lean();
  if (!project) throw new BizError("项目不存在", 404);
  if (project.status === "DISABLED") throw new BizError("项目已停用", 400);

  req.user.currentProject = project._id;
  await req.user.save();

  const user = await User.findById(req.user._id).populate("currentProject accessibleProjects");
  return { data: {
    _id: project._id,
    name: project.name,
    code: project.code,
    address: project.address,
    developer: project.developer,
  } };
};

module.exports = exports;
