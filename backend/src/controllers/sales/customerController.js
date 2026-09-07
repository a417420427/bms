const mongoose = require("mongoose");
const Customer = require("../../models/Customer");
const Approval = require("../../models/Approval");
const SystemConfig = require("../../models/SystemConfig");
const config = require("../../config");
const { BizError } = require("../../utils/response");
const { isValidPhone, isWithinOffset, parsePaging } = require("../../utils/validators");
const { writeAudit } = require("../../utils/audit");
const { AUDIT_ACTION, CUSTOMER_SOURCE, CUSTOMER_STATUS } = require("../../utils/constants");
const { APPROVAL_TYPE } = require("../../models/Approval");

// POST /api/sales/customer/check-duplicate
// 扫描：我的客户 + 公共池 + 渠道推荐 + 过期池（同一项目）
exports.checkDuplicate = async (req, res) => {
  const { phone } = req.body || {};
  if (!phone) throw new BizError("缺少手机号", 400);

  const { projectId } = req.projectContext;

  // 脱敏手机号不参与查重
  const exist = await Customer.findOne({
    projectId,
    $or: [
      { phone, isMasked: false },
      { rawPhone: phone },
    ],
  }).lean();

  if (!exist) return { data: { duplicated: false } };

  return {
    data: {
      duplicated: true,
      conflict: {
        _id: exist._id,
        name: exist.name,
        source: exist.source,
        status: exist.status,
        owner: exist.owner ? exist.owner.toString() : null,
      },
    },
  };
};

// POST /api/sales/customer
// 时间校验：到访时间不能晚于系统时间4小时以上
// 冲突时自动生成审批单
exports.create = async (req, res) => {
  const {
    name,
    phone,
    age,
    source,
    intentLevel,
    visitTime,
    visitPhotos = [],
    remark,
    forceConflict = false,
  } = req.body || {};

  if (!name) throw new BizError("客户姓名必填", 400);
  if (!phone || !isValidPhone(phone)) throw new BizError("手机号格式不正确", 400);
  if (!source || !Object.values(CUSTOMER_SOURCE).includes(source)) {
    throw new BizError("到访渠道不合法", 400);
  }
  if (!intentLevel) throw new BizError("意向等级必填", 400);
  if (!visitTime) throw new BizError("到访时间必填", 400);

  const { projectId } = req.projectContext;

  const sysCfg = (await SystemConfig.findOne({ projectId: { $in: [projectId, null] } }).sort({ projectId: -1 })) || {};
  const offsetHours = sysCfg.visitMaxOffsetHours ?? config.business.visitCountdownHours;
  if (!isWithinOffset(visitTime, offsetHours)) {
    throw new BizError(`到访时间不能晚于系统时间 ${offsetHours} 小时以上`, 400);
  }

  // 查重（同项目）
  const exist = await Customer.findOne({
    projectId,
    $or: [{ phone, isMasked: false }, { rawPhone: phone }],
  }).lean();

  if (exist && !forceConflict) {
    // 直接抛出冲突提示，前端需用户确认后用 forceConflict=true 重发触发审批
    throw new BizError("客户手机号已存在，是否提交冲突审批？", 409, {
      needApproval: true,
      conflictCustomerId: exist._id,
    });
  }

  if (exist && forceConflict) {
    // 创建冲突审批单
    const approval = await Approval.create({
      type: APPROVAL_TYPE.CUSTOMER_CONFLICT,
      result: APPROVAL_RESULT.PENDING,
      applicant: req.user._id,
      applicantName: req.user.realName || req.user.username,
      projectId,
      snapshot: { name, phone, age, source, intentLevel, visitTime, visitPhotos, remark, ownerId: req.user._id },
      remark: "冲突录入审批",
    });

    await writeAudit({
      operator: req.user._id,
      operatorName: req.user.realName || req.user.username,
      action: AUDIT_ACTION.CUSTOMER_CREATE,
      module: "SALES",
      target: name,
      projectId,
      detail: { conflictApproval: approval._id },
      ip: req.ip,
    });

    return { data: { needApproval: true, approvalId: approval._id, message: "已提交冲突审批，等待管理员审核" } };
  }

  // 正常创建
  const customer = await Customer.create({
    name,
    phone,
    rawPhone: phone,
    age,
    source,
    intentLevel,
    status: CUSTOMER_STATUS.ACTIVE,
    visitTime: new Date(visitTime),
    visitPhotos,
    remark,
    projectId,
    owner: req.user._id,
    lastFollowupAt: new Date(visitTime),
  });

  await customer.populate("owner", "realName username phone");

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CUSTOMER_CREATE,
    module: "SALES",
    target: name,
    projectId,
    detail: { customerId: customer._id },
    ip: req.ip,
  });

  return { data: customer };
};

// GET /api/sales/customers
// 仅查询归属自己的客户
exports.list = async (req, res) => {
  const { projectId } = req.projectContext;
  const owner = req.user._id;
  const { page, pageSize, skip } = parsePaging(req.query);
  const { intentLevel, source, followupStart, followupEnd, visited, keyword } = req.query;

  const filter = { projectId, owner, status: { $in: ["ACTIVE", "DEAL"] } };
  if (intentLevel) filter.intentLevel = intentLevel;
  if (source) filter.source = source;
  if (followupStart || followupEnd) {
    filter.lastFollowupAt = {};
    if (followupStart) filter.lastFollowupAt.$gte = new Date(followupStart);
    if (followupEnd) filter.lastFollowupAt.$lte = new Date(followupEnd);
  }
  if (visited === "true") filter.visitTime = { $exists: true, $ne: null };
  if (visited === "false") filter.$or = [{ visitTime: null }, { visitTime: { $exists: false } }];
  if (keyword) {
    filter.$and = filter.$and || [];
    filter.$and.push({ $or: [{ name: new RegExp(keyword, "i") }, { phone: new RegExp(keyword, "i") }] });
  }

  const [list, total] = await Promise.all([
    Customer.find(filter)
      .populate("owner", "realName username phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Customer.countDocuments(filter),
  ]);

  return { data: { list, total, page, pageSize } };
};

// GET /api/sales/customer/:id
// 0907: 手机号加密，非管理员只能看自己客户的手机号
exports.detail = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new BizError("客户ID无效", 400);

  const { projectId } = req.projectContext;
  const customer = await Customer.findOne({ _id: id, projectId })
    .populate("owner", "realName username phone")
    .populate("channelUser", "realName username")
    .populate("company", "name")
    .lean();
  if (!customer) throw new BizError("客户不存在", 404);

  // 销售员只能查看归属自己的（或公共池中尚未认领的）
  const isOwner = customer.owner?._id?.toString() === req.user._id.toString();
  if (!isOwner && customer.status !== "PUBLIC_POOL") {
    throw new BizError("无权访问该客户", 403);
  }

  // 0907: 非归属人（公共池）脱敏手机号
  if (!isOwner) {
    const { maskPhone } = require("../../utils/validators");
    customer.phone = maskPhone(customer.rawPhone || customer.phone);
  }

  return { data: customer };
};

// PUT /api/sales/customer/:id/intent
exports.updateIntent = async (req, res) => {
  const { id } = req.params;
  const { intentLevel } = req.body || {};
  if (!intentLevel) throw new BizError("intentLevel 必填", 400);

  const { projectId } = req.projectContext;
  const customer = await Customer.findOne({ _id: id, projectId, owner: req.user._id });
  if (!customer) throw new BizError("客户不存在或无权操作", 404);

  const before = customer.intentLevel;
  customer.intentLevel = intentLevel;
  await customer.save();

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CUSTOMER_INTENT_CHANGE,
    module: "SALES",
    target: customer.name,
    projectId,
    detail: { customerId: customer._id, before, after: intentLevel },
    ip: req.ip,
  });

  return { data: customer };
};

// PUT /api/sales/customer/:id
// 仅归属本人可编辑
exports.update = async (req, res) => {
  const { id } = req.params;
  const { projectId } = req.projectContext;
  const customer = await Customer.findOne({ _id: id, projectId, owner: req.user._id });
  if (!customer) throw new BizError("客户不存在或无权操作", 404);

  const before = customer.toObject();
  const allowed = ["name", "phone", "age", "source", "intentLevel", "visitTime", "visitPhotos", "remark"];
  const changes = {};
  allowed.forEach((k) => {
    if (k in (req.body || {})) {
      changes[k] = { before: before[k], after: req.body[k] };
      customer[k] = req.body[k];
    }
  });
  await customer.save();

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CUSTOMER_UPDATE,
    module: "SALES",
    target: customer.name,
    projectId,
    detail: { customerId: customer._id, changes },
    ip: req.ip,
  });

  return { data: customer };
};
