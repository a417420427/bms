const mongoose = require("mongoose");
const Customer = require("../../models/Customer");
const Approval = require("../../models/Approval");
const { APPROVAL_TYPE, APPROVAL_RESULT } = require("../../models/Approval");
const { BizError } = require("../../utils/response");
const { parsePaging, maskPhone } = require("../../utils/validators");
const { writeAudit } = require("../../utils/audit");
const { AUDIT_ACTION } = require("../../utils/constants");

// GET /api/sales/unvisited-pool
// 渠道员推荐但尚未被销售申领的客户（status=UNVISITED，归属未定）
// 0907: 手机号加密，非管理员只能看自己客户的手机号（未到访池客户归属未定，一律脱敏）
exports.list = async (req, res) => {
  const { projectId } = req.projectContext;
  const { page, pageSize, skip } = parsePaging(req.query);
  const { source, ageHours, keyword } = req.query;

  const filter = { projectId, status: "UNVISITED" };
  if (source) filter.source = source;
  if (ageHours) {
    const threshold = new Date(Date.now() - parseInt(ageHours, 10) * 3600 * 1000);
    filter.createdAt = { $lt: threshold };
  }
  if (keyword) filter.name = new RegExp(keyword, "i");

  const [list, total] = await Promise.all([
    Customer.find(filter)
      .populate("channelUser", "realName username")
      .populate("company", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Customer.countDocuments(filter),
  ]);

  // 0907: 未到访池客户归属未定，一律脱敏手机号
  const out = list.map((c) => {
    c.phone = maskPhone(c.rawPhone || c.phone);
    return c;
  });

  return { data: { list: out, total, page, pageSize } };
};

// POST /api/sales/unvisited-pool/claim
// 申领未到访客户 → 生成审批待办
exports.claim = async (req, res) => {
  const { customerId } = req.body || {};
  if (!customerId) throw new BizError("customerId 必填", 400);

  const { projectId } = req.projectContext;
  const customer = await Customer.findOne({ _id: customerId, projectId, status: "UNVISITED" });
  if (!customer) throw new BizError("未到访申领池中无此客户", 404);

  // 已存在该销售员的待审批申请，避免重复
  const existApproval = await Approval.findOne({
    type: APPROVAL_TYPE.CLAIM_UNVISITED,
    customerId,
    result: APPROVAL_RESULT.PENDING,
  });
  if (existApproval) throw new BizError("该客户已有申领申请待审批", 409);

  const approval = await Approval.create({
    type: APPROVAL_TYPE.CLAIM_UNVISITED,
    result: APPROVAL_RESULT.PENDING,
    applicant: req.user._id,
    applicantName: req.user.realName || req.user.username,
    customerId,
    projectId,
    remark: "未到访申领申请",
  });

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CLAIM_UNVISITED,
    module: "SALES",
    target: customerId,
    projectId,
    detail: { approvalId: approval._id },
    ip: req.ip,
  });

  return { data: { approvalId: approval._id, message: "申领申请已提交，等待审批" } };
};
