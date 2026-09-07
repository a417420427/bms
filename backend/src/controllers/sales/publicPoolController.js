const mongoose = require("mongoose");
const PublicPool = require("../../models/PublicPool");
const Customer = require("../../models/Customer");
const Approval = require("../../models/Approval");
const { APPROVAL_TYPE, APPROVAL_RESULT } = require("../../models/Approval");
const { BizError } = require("../../utils/response");
const { parsePaging } = require("../../utils/validators");
const { writeAudit } = require("../../utils/audit");
const { AUDIT_ACTION } = require("../../utils/constants");

// GET /api/sales/public-pool
// 销售员可申领的公共池客户
exports.list = async (req, res) => {
  const { projectId } = req.projectContext;
  const { page, pageSize, skip } = parsePaging(req.query);
  const { keyword } = req.query;

  const filter = { projectId, archived: { $ne: true } };
  if (keyword) {
    const customers = await Customer.find({ projectId, name: new RegExp(keyword, "i") }, "_id").lean();
    filter.customerId = { $in: customers.map((c) => c._id) };
  }

  const [list, total] = await Promise.all([
    PublicPool.find(filter)
      .populate({
        path: "customerId",
        select: "name phone source intentLevel status visitTime owner",
        populate: { path: "owner", select: "realName username" },
      })
      .sort({ releasedAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    PublicPool.countDocuments(filter),
  ]);

  // 转换结构使其符合 PublicPoolItem 类型
  const out = list.map((p) => ({
    _id: p._id,
    customer: p.customerId,
    customerId: p.customerId?._id,
    reason: p.reason,
    releasedAt: p.releasedAt,
    pendingApprovalId: p.pendingApprovalId,
  }));

  return { data: { list: out, total, page, pageSize } };
};

// POST /api/sales/public-pool/claim
// 销售员申请认领公共池客户 → 生成审批待办给管理员
exports.claim = async (req, res) => {
  const { customerId } = req.body || {};
  if (!customerId) throw new BizError("customerId 必填", 400);

  const { projectId } = req.projectContext;
  const pool = await PublicPool.findOne({ customerId, projectId, archived: { $ne: true } });
  if (!pool) throw new BizError("公共池中无此客户", 404);

  if (pool.pendingApprovalId) {
    throw new BizError("该客户已有认领申请待审批", 409);
  }

  const approval = await Approval.create({
    type: APPROVAL_TYPE.CLAIM_PUBLIC,
    result: APPROVAL_RESULT.PENDING,
    applicant: req.user._id,
    applicantName: req.user.realName || req.user.username,
    customerId,
    publicPoolId: pool._id,
    projectId,
    remark: "公共池认领申请",
  });

  pool.pendingApprovalId = approval._id;
  await pool.save();

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CLAIM_PUBLIC,
    module: "SALES",
    target: customerId,
    projectId,
    detail: { approvalId: approval._id },
    ip: req.ip,
  });

  return { data: { approvalId: approval._id, message: "认领申请已提交，等待审批" } };
};
