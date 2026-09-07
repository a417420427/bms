const Company = require("../../models/Company");
const { BizError } = require("../../utils/response");
const { writeAudit } = require("../../utils/audit");
const { AUDIT_ACTION } = require("../../utils/constants");

// GET /api/admin/companies?projectId=
exports.list = async (req, res) => {
  const { projectId } = req.query || {};
  const filter = { status: "ACTIVE" };
  if (projectId) filter.projectId = projectId;
  const list = await Company.find(filter).sort({ createdAt: -1 }).lean();
  return { data: list };
};

// POST /api/admin/companies
exports.create = async (req, res) => {
  const { name, projectId, contactName, contactPhone, address, remark } = req.body || {};
  if (!name || !projectId) throw new BizError("名称/项目必填", 400);

  const exists = await Company.findOne({ name, projectId });
  if (exists) throw new BizError("同项目下公司名称已存在", 409);

  const company = await Company.create({ name, projectId, contactName, contactPhone, address, remark });

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.COMPANY_CREATE,
    module: "ADMIN",
    target: name,
    projectId,
    detail: { company },
    ip: req.ip,
  });

  return { data: company };
};

// PUT /api/admin/companies/:id
exports.update = async (req, res) => {
  const { id } = req.params;
  const company = await Company.findById(id);
  if (!company) throw new BizError("公司不存在", 404);

  const before = company.toObject();
  const allowed = ["name", "contactName", "contactPhone", "address", "remark", "status"];
  allowed.forEach((k) => {
    if (k in (req.body || {})) company[k] = req.body[k];
  });
  await company.save();

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.COMPANY_UPDATE,
    module: "ADMIN",
    target: company.name,
    projectId: company.projectId,
    detail: { before, after: req.body },
    ip: req.ip,
  });

  return { data: company };
};
