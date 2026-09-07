const Project = require("../../models/Project");
const User = require("../../models/User");
const { BizError } = require("../../utils/response");
const { writeAudit } = require("../../utils/audit");
const { AUDIT_ACTION } = require("../../utils/constants");

// GET /api/admin/projects
exports.list = async (req, res) => {
  const list = await Project.find().sort({ createdAt: -1 }).lean();
  return { data: list };
};

// POST /api/admin/projects
exports.create = async (req, res) => {
  const { name, code, address, developer, remark } = req.body || {};
  if (!name) throw new BizError("项目名称必填", 400);

  const exists = await Project.findOne({ $or: [{ name }, { code: code || name }] });
  if (exists) throw new BizError("项目名称或编码重复", 409);

  const project = await Project.create({ name, code, address, developer, remark });

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.PROJECT_CREATE,
    module: "ADMIN",
    target: name,
    projectId: project._id,
    detail: { project },
    ip: req.ip,
  });

  return { data: project };
};

// PUT /api/admin/projects/:id
exports.update = async (req, res) => {
  const { id } = req.params;
  const project = await Project.findById(id);
  if (!project) throw new BizError("项目不存在", 404);

  const before = project.toObject();
  const allowed = ["name", "code", "address", "developer", "remark", "status"];
  allowed.forEach((k) => {
    if (k in (req.body || {})) project[k] = req.body[k];
  });
  await project.save();

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.PROJECT_UPDATE,
    module: "ADMIN",
    target: project.name,
    projectId: project._id,
    detail: { before, after: req.body },
    ip: req.ip,
  });

  return { data: project };
};
