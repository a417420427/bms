const mongoose = require("mongoose");
const Approval = require("../../models/Approval");
const Customer = require("../../models/Customer");
const PublicPool = require("../../models/PublicPool");
const User = require("../../models/User");
const { APPROVAL_TYPE, APPROVAL_RESULT } = require("../../models/Approval");
const { BizError } = require("../../utils/response");
const { parsePaging } = require("../../utils/validators");
const { writeAudit } = require("../../utils/audit");
const { writeTransferLog } = require("../../utils/transferLog");
const { AUDIT_ACTION, TRANSFER_ACTION, CUSTOMER_STATUS } = require("../../utils/constants");

// GET /api/admin/unvisited-approvals
// 未到访申领审批待办
exports.unvisitedApprovals = async (req, res) => {
  const ctx = req.projectContext;
  const projectFilter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };

  const { page, pageSize, skip } = parsePaging(req.query);
  const filter = { ...projectFilter, type: APPROVAL_TYPE.CLAIM_UNVISITED, result: APPROVAL_RESULT.PENDING };

  const [list, total] = await Promise.all([
    Approval.find(filter)
      .populate("applicant", "realName username phone")
      .populate("customerId", "name phone source status visitTime channelUser company referrerName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Approval.countDocuments(filter),
  ]);

  return { data: { list, total, page, pageSize } };
};

// POST /api/admin/approve-unvisited
// 同意：客户归属申领销售员；驳回：退回未到访申领池
exports.approveUnvisited = async (req, res) => {
  const { approvalId, result, remark } = req.body || {};
  if (!approvalId || !result) throw new BizError("参数不完整", 400);
  if (!["APPROVED", "REJECTED"].includes(result)) throw new BizError("result 不合法", 400);

  const ctx = req.projectContext;
  const projectFilter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };

  const approval = await Approval.findOne({ _id: approvalId, ...projectFilter, type: APPROVAL_TYPE.CLAIM_UNVISITED, result: APPROVAL_RESULT.PENDING });
  if (!approval) throw new BizError("审批单不存在或已处理", 404);

  approval.result = result;
  approval.handler = req.user._id;
  approval.handlerName = req.user.realName || req.user.username;
  approval.handledAt = new Date();
  approval.handleRemark = remark || "";
  await approval.save();

  const customer = await Customer.findById(approval.customerId);

  if (result === "APPROVED") {
    customer.owner = approval.applicant;
    customer.status = CUSTOMER_STATUS.ACTIVE;
    customer.lastFollowupAt = new Date();
    await customer.save();

    await writeTransferLog({
      customerId: customer._id,
      projectId: customer.projectId,
      customerName: customer.name,
      toUser: approval.applicant,
      toUserName: approval.applicantName,
      action: TRANSFER_ACTION.APPROVE,
      reason: "未到访申领审批通过",
      operator: req.user._id,
      operatorName: req.user.realName || req.user.username,
    });
  }
  // 驳回：保持 UNVISITED 状态，等待他人申领

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.APPROVE,
    module: "ADMIN",
    target: customer?.name || "",
    projectId: customer?.projectId,
    detail: { approvalId, type: approval.type, result, customerId: customer?._id },
    ip: req.ip,
  });

  return { data: { approval, message: result === "APPROVED" ? "审批已通过，客户归属已更新" : "审批已驳回" } };
};

// POST /api/admin/approve-claim
// 公共池认领审批：同意 → 归属销售员；驳回 → 退回公共池
exports.approveClaim = async (req, res) => {
  const { approvalId, result, remark } = req.body || {};
  if (!approvalId || !result) throw new BizError("参数不完整", 400);
  if (!["APPROVED", "REJECTED"].includes(result)) throw new BizError("result 不合法", 400);

  const ctx = req.projectContext;
  const projectFilter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };

  const approval = await Approval.findOne({ _id: approvalId, ...projectFilter, type: APPROVAL_TYPE.CLAIM_PUBLIC, result: APPROVAL_RESULT.PENDING });
  if (!approval) throw new BizError("审批单不存在或已处理", 404);

  approval.result = result;
  approval.handler = req.user._id;
  approval.handlerName = req.user.realName || req.user.username;
  approval.handledAt = new Date();
  approval.handleRemark = remark || "";
  await approval.save();

  const customer = await Customer.findById(approval.customerId);
  const pool = await PublicPool.findById(approval.publicPoolId);

  if (result === "APPROVED") {
    customer.owner = approval.applicant;
    customer.status = CUSTOMER_STATUS.ACTIVE;
    customer.lastFollowupAt = new Date();
    await customer.save();
    if (pool) {
      pool.archived = true;
      pool.pendingApprovalId = null;
      await pool.save();
    }

    await writeTransferLog({
      customerId: customer._id,
      projectId: customer.projectId,
      customerName: customer.name,
      toUser: approval.applicant,
      toUserName: approval.applicantName,
      action: TRANSFER_ACTION.APPROVE,
      reason: "公共池认领审批通过",
      operator: req.user._id,
      operatorName: req.user.realName || req.user.username,
    });
  } else {
    // 驳回：退回公共池
    if (pool) {
      pool.pendingApprovalId = null;
      await pool.save();
    }
  }

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.APPROVE,
    module: "ADMIN",
    target: customer?.name || "",
    projectId: customer?.projectId,
    detail: { approvalId, type: approval.type, result, customerId: customer?._id },
    ip: req.ip,
  });

  return { data: { approval, message: result === "APPROVED" ? "审批已通过，客户已分配" : "审批已驳回，客户退回公共池" } };
};

// POST /api/admin/approve-conflict
// 冲突录入审批：同意 → 创建客户档案归属当前销售员；驳回 → 丢弃审批快照
exports.approveConflict = async (req, res) => {
  const { approvalId, result, remark } = req.body || {};
  if (!approvalId || !result) throw new BizError("参数不完整", 400);
  if (!["APPROVED", "REJECTED"].includes(result)) throw new BizError("result 不合法", 400);

  const ctx = req.projectContext;
  const projectFilter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };

  const approval = await Approval.findOne({ _id: approvalId, ...projectFilter, type: APPROVAL_TYPE.CUSTOMER_CONFLICT, result: APPROVAL_RESULT.PENDING });
  if (!approval) throw new BizError("审批单不存在或已处理", 404);

  approval.result = result;
  approval.handler = req.user._id;
  approval.handlerName = req.user.realName || req.user.username;
  approval.handledAt = new Date();
  approval.handleRemark = remark || "";
  await approval.save();

  let customer = null;
  if (result === "APPROVED") {
    const s = approval.snapshot || {};
    customer = await Customer.create({
      name: s.name,
      phone: s.phone,
      rawPhone: s.phone,
      age: s.age,
      source: s.source,
      intentLevel: s.intentLevel,
      status: CUSTOMER_STATUS.ACTIVE,
      visitTime: new Date(s.visitTime),
      visitPhotos: s.visitPhotos || [],
      remark: s.remark,
      projectId: approval.projectId,
      owner: s.ownerId || approval.applicant,
      conflictApproval: approval._id,
      lastFollowupAt: new Date(s.visitTime),
    });

    await writeTransferLog({
      customerId: customer._id,
      projectId: approval.projectId,
      customerName: customer.name,
      toUser: approval.applicant,
      toUserName: approval.applicantName,
      action: TRANSFER_ACTION.CONFLICT_APPROVED,
      reason: "冲突录入审批通过",
      operator: req.user._id,
      operatorName: req.user.realName || req.user.username,
    });
  }

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.APPROVE,
    module: "ADMIN",
    target: customer?.name || approval.snapshot?.name || "",
    projectId: approval.projectId,
    detail: { approvalId, type: approval.type, result, customerId: customer?._id },
    ip: req.ip,
  });

  return { data: { approval, customer, message: result === "APPROVED" ? "审批已通过，客户档案已创建" : "审批已驳回" } };
};
