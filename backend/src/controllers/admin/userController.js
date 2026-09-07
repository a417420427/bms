const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../../models/User");
const Project = require("../../models/Project");
const { BizError } = require("../../utils/response");
const { ROLE } = require("../../utils/constants");
const { writeAudit } = require("../../utils/audit");
const { AUDIT_ACTION } = require("../../utils/constants");

// GET /api/admin/users
exports.list = async (req, res) => {
  const { role, keyword, projectId } = req.query || {};
  const filter = {};
  if (role) filter.role = role;
  if (projectId) filter.accessibleProjects = projectId;
  if (keyword) {
    filter.$or = [
      { username: new RegExp(keyword, "i") },
      { realName: new RegExp(keyword, "i") },
      { phone: new RegExp(keyword, "i") },
    ];
  }
  const users = await User.find(filter)
    .populate("accessibleProjects", "name code")
    .populate("currentProject", "name code")
    .sort({ createdAt: -1 })
    .lean();

  const out = users.map((u) => {
    delete u.password;
    return u;
  });

  return { data: out };
};

// POST /api/admin/users
exports.create = async (req, res) => {
  const { username, password, realName, phone, role, accessibleProjects = [], currentProject } = req.body || {};
  if (!username || !password) throw new BizError("用户名/密码必填", 400);
  if (!role || !Object.values(ROLE).includes(role)) throw new BizError("角色不合法", 400);

  const exists = await User.findOne({ username });
  if (exists) throw new BizError("用户名已存在", 409);

  const user = await User.create({
    username,
    password: await bcrypt.hash(password, 10),
    realName: realName || "",
    phone: phone || "",
    role,
    accessibleProjects,
    currentProject: currentProject || (accessibleProjects?.[0] || null),
  });

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.USER_CREATE,
    module: "ADMIN",
    target: username,
    detail: { userId: user._id, role, realName },
    ip: req.ip,
  });

  const populated = await User.findById(user._id)
    .populate("accessibleProjects", "name code")
    .populate("currentProject", "name code");
  return { data: populated };
};

// PUT /api/admin/users/:id
exports.update = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) throw new BizError("用户不存在", 404);

  const before = user.toObject();
  const allowed = ["realName", "phone", "role", "status", "accessibleProjects", "currentProject", "avatar"];
  allowed.forEach((k) => {
    if (k in (req.body || {})) user[k] = req.body[k];
  });
  await user.save();

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.USER_UPDATE,
    module: "ADMIN",
    target: user.username,
    detail: { before, after: req.body },
    ip: req.ip,
  });

  const populated = await User.findById(user._id)
    .populate("accessibleProjects", "name code")
    .populate("currentProject", "name code");
  return { data: populated };
};

// POST /api/admin/users/:id/reset-password
// 重置为默认密码
exports.resetPassword = async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) throw new BizError("用户不存在", 404);

  const defaultPwd = "123456";
  user.password = await bcrypt.hash(defaultPwd, 10);
  await user.save();

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.USER_RESET_PASSWORD,
    module: "ADMIN",
    target: user.username,
    detail: { userId: user._id, defaultPassword: defaultPwd },
    ip: req.ip,
  });

  return { data: { ok: true, defaultPassword: defaultPwd, message: "密码已重置为 123456" } };
};
