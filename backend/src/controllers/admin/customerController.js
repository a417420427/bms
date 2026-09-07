const mongoose = require("mongoose");
const Customer = require("../../models/Customer");
const Followup = require("../../models/Followup");
const TransferLog = require("../../models/TransferLog");
const Company = require("../../models/Company");
const { BizError } = require("../../utils/response");
const { isValidPhone, isWithinOffset, parsePaging } = require("../../utils/validators");
const { writeAudit } = require("../../utils/audit");
const { writeTransferLog } = require("../../utils/transferLog");
const { AUDIT_ACTION, TRANSFER_ACTION, CUSTOMER_STATUS, CUSTOMER_SOURCE } = require("../../utils/constants");

// POST /api/admin/customer
// 0907: 管理员新增客户录入，支持全部到访渠道（自访/自拓/渠道公司推荐/个人推荐）
// 选择渠道公司推荐时需传 companyId；到访时间字段语义为"预计到访时间"
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
    companyId,
    referrerName,
    ownerId,
  } = req.body || {};

  if (!name) throw new BizError("客户姓名必填", 400);
  if (!phone || !isValidPhone(phone)) throw new BizError("手机号格式不正确", 400);
  if (!source || !Object.values(CUSTOMER_SOURCE).includes(source)) {
    throw new BizError("到访渠道不合法", 400);
  }
  if (!intentLevel) throw new BizError("意向等级必填", 400);
  if (!visitTime) throw new BizError("预计到访时间必填", 400);

  const ctx = req.projectContext;

  // 渠道公司推荐需选择合作公司
  let company = null;
  if (source === CUSTOMER_SOURCE.CHANNEL_COMPANY) {
    if (!companyId) throw new BizError("渠道公司推荐需选择合作公司", 400);
    company = await Company.findOne({ _id: companyId, projectId: ctx.projectId });
    if (!company) throw new BizError("合作公司不存在", 404);
  }

  // 校验预计到访时间偏移
  const SystemConfig = require("../../models/SystemConfig");
  const config = require("../../config");
  const sysCfg = (await SystemConfig.findOne({ projectId: { $in: [ctx.projectId, null] } }).sort({ projectId: -1 })) || {};
  const offsetHours = sysCfg.visitMaxOffsetHours ?? config.business.visitCountdownHours;
  if (!isWithinOffset(visitTime, offsetHours)) {
    throw new BizError(`预计到访时间不能晚于系统时间 ${offsetHours} 小时以上`, 400);
  }

  // 查重（同项目）
  const exist = await Customer.findOne({
    projectId: ctx.projectId,
    $or: [{ phone, isMasked: false }, { rawPhone: phone }],
  }).lean();
  if (exist) throw new BizError("客户手机号已存在", 409);

  // 指定归属销售员（可选）
  let owner = null;
  if (ownerId) {
    const User = require("../../models/User");
    owner = await User.findOne({ _id: ownerId, role: "ROLE_SALES", accessibleProjects: ctx.projectId });
    if (!owner) throw new BizError("销售员不存在或无该项目权限", 404);
  }

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
    projectId: ctx.projectId,
    owner: owner ? owner._id : null,
    company: company ? company._id : null,
    referrerName: referrerName || null,
    lastFollowupAt: new Date(visitTime),
  });

  await customer.populate("owner", "realName username phone");
  await customer.populate("company", "name");

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CUSTOMER_CREATE,
    module: "ADMIN",
    target: name,
    projectId: ctx.projectId,
    detail: { customerId: customer._id, source, ownerId: owner ? owner._id : null },
    ip: req.ip,
  });

  return { data: customer };
};

// GET /api/admin/customers
// 多维筛选：项目、来源类型、归属人、意向等级、客户状态、时间范围、搜索
exports.list = async (req, res) => {
  const ctx = req.projectContext;
  const { page, pageSize, skip } = parsePaging(req.query);
  const { projectId, source, owner, intentLevel, status, startDate, endDate, keyword } = req.query;

  const filter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };

  if (projectId) filter.projectId = projectId;
  if (source) filter.source = source;
  if (owner) filter.owner = owner;
  if (intentLevel) filter.intentLevel = intentLevel;
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  if (keyword) {
    filter.$or = [
      { name: new RegExp(keyword, "i") },
      { phone: new RegExp(keyword, "i") },
    ];
  }

  const [list, total] = await Promise.all([
    Customer.find(filter)
      .populate("owner", "realName username phone")
      .populate("channelUser", "realName username")
      .populate("company", "name")
      .populate("projectId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Customer.countDocuments(filter),
  ]);

  // 管理员可见全号
  const out = list.map((c) => ({
    ...c,
    phone: c.rawPhone || c.phone,
  }));

  return { data: { list: out, total, page, pageSize } };
};

// GET /api/admin/customer/:id
exports.detail = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new BizError("客户ID无效", 400);
  const ctx = req.projectContext;
  const projectFilter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };

  const customer = await Customer.findOne({ _id: id, ...projectFilter })
    .populate("owner", "realName username phone")
    .populate("channelUser", "realName username")
    .populate("company", "name")
    .populate("projectId", "name code address developer")
    .lean();
  if (!customer) throw new BizError("客户不存在", 404);

  // 管理员可见全号
  customer.phone = customer.rawPhone || customer.phone;

  return { data: customer };
};

// PUT /api/admin/customer/:id
// 强制记录：修改人、时间、修改前值、修改后值
exports.update = async (req, res) => {
  const { id } = req.params;
  const ctx = req.projectContext;
  const projectFilter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };

  const customer = await Customer.findOne({ _id: id, ...projectFilter });
  if (!customer) throw new BizError("客户不存在", 404);

  const before = customer.toObject();
  const allowed = ["name", "phone", "rawPhone", "age", "source", "intentLevel", "status", "visitTime", "visitPhotos", "remark", "owner", "channelUser", "company"];
  const changes = {};
  allowed.forEach((k) => {
    if (k in (req.body || {})) {
      const b = JSON.stringify(before[k]);
      const a = JSON.stringify(req.body[k]);
      if (b !== a) {
        changes[k] = { before: before[k], after: req.body[k] };
        customer[k] = req.body[k];
      }
    }
  });
  await customer.save();

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CUSTOMER_UPDATE,
    module: "ADMIN",
    target: customer.name,
    projectId: customer.projectId,
    detail: { customerId: customer._id, before, after: req.body, changes },
    ip: req.ip,
  });

  return { data: customer };
};

// POST /api/admin/assign-customer
// 分配客户给销售员/渠道员，或移入公共池
exports.assign = async (req, res) => {
  const { customerId, targetUserId, moveToPublicPool = false } = req.body || {};
  if (!customerId) throw new BizError("customerId 必填", 400);

  const ctx = req.projectContext;
  const projectFilter = ctx.multi
    ? { projectId: { $in: ctx.accessibleProjectIds } }
    : { projectId: ctx.projectId };

  const customer = await Customer.findOne({ _id: customerId, ...projectFilter });
  if (!customer) throw new BizError("客户不存在", 404);

  const PublicPool = require("../../models/PublicPool");
  const User = require("../../models/User");

  const fromUser = customer.owner;
  const fromUserName = await User.findById(fromUser).select("realName username").lean();

  if (moveToPublicPool) {
    // 移入公共池
    const pool = await PublicPool.create({
      customerId: customer._id,
      projectId: customer.projectId,
      reason: "管理员移入公共池",
      previousOwner: fromUser,
    });
    customer.status = CUSTOMER_STATUS.PUBLIC_POOL;
    customer.owner = null;
    await customer.save();

    await writeTransferLog({
      customerId: customer._id,
      projectId: customer.projectId,
      customerName: customer.name,
      fromUser,
      fromUserName: fromUserName?.realName || fromUserName?.username,
      action: TRANSFER_ACTION.MOVE_PUBLIC,
      reason: "管理员移入公共池",
      operator: req.user._id,
      operatorName: req.user.realName || req.user.username,
    });

    await writeAudit({
      operator: req.user._id,
      operatorName: req.user.realName || req.user.username,
      action: AUDIT_ACTION.MOVE_PUBLIC,
      module: "ADMIN",
      target: customer.name,
      projectId: customer.projectId,
      detail: { customerId, publicPoolId: pool._id },
      ip: req.ip,
    });

    return { data: { customer, message: "已移入公共池" } };
  }

  if (!targetUserId || !mongoose.isValidObjectId(targetUserId)) {
    throw new BizError("targetUserId 无效", 400);
  }
  const target = await User.findOne({ _id: targetUserId, accessibleProjects: customer.projectId });
  if (!target) throw new BizError("目标用户不存在或无该项目权限", 404);
  if (target.role === "ROLE_ADMIN") throw new BizError("不能分配给管理员", 400);

  customer.owner = target._id;
  if (customer.status === "PUBLIC_POOL" || customer.status === "EXPIRED") {
    customer.status = CUSTOMER_STATUS.ACTIVE;
  }
  await customer.save();

  await writeTransferLog({
    customerId: customer._id,
    projectId: customer.projectId,
    customerName: customer.name,
    fromUser,
    fromUserName: fromUserName?.realName || fromUserName?.username,
    toUser: target._id,
    toUserName: target.realName || target.username,
    action: TRANSFER_ACTION.ASSIGN,
    reason: "管理员分配",
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
  });

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CUSTOMER_ASSIGN,
    module: "ADMIN",
    target: customer.name,
    projectId: customer.projectId,
    detail: { customerId, fromUser, toUser: target._id },
    ip: req.ip,
  });

  return { data: { customer, message: "客户归属已更新" } };
};

// GET /api/admin/followups/:customerId
exports.listFollowups = async (req, res) => {
  const { customerId } = req.params;
  if (!mongoose.isValidObjectId(customerId)) throw new BizError("客户ID无效", 400);

  const list = await Followup.find({ customerId })
    .populate("operator", "realName username")
    .sort({ followupTime: -1 })
    .lean();
  return { data: list };
};

// GET /api/admin/customer/:id/transfer-log
exports.transferLogs = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new BizError("客户ID无效", 400);

  const list = await TransferLog.find({ customerId: id })
    .populate("fromUser toUser operator", "realName username")
    .sort({ createdAt: -1 })
    .lean();
  return { data: list };
};
