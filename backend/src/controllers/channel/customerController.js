const mongoose = require("mongoose");
const Customer = require("../../models/Customer");
const SystemConfig = require("../../models/SystemConfig");
const Company = require("../../models/Company");
const config = require("../../config");
const { BizError } = require("../../utils/response");
const { isValidPhone, isWithinOffset, maskPhone, parsePaging } = require("../../utils/validators");
const { writeAudit } = require("../../utils/audit");
const { writeTransferLog: writeTransfer } = require("../../utils/transferLog");
const { AUDIT_ACTION, TRANSFER_ACTION, CUSTOMER_STATUS } = require("../../utils/constants");

// POST /api/channel/customer?type=A|B
// A类：合作公司推荐，手机号脱敏录入
// B类：个人推荐，手机号完整 + 强制查重
// 时间校验：推荐时间不能早于录入时间4小时以上（即不能晚于系统时间4小时以上）
exports.create = async (req, res) => {
  const type = (req.query.type || "A").toUpperCase();
  if (!["A", "B"].includes(type)) throw new BizError("type 仅支持 A/B", 400);

  const body = req.body || {};
  const { projectId, project } = req.projectContext;

  const sysCfg = (await SystemConfig.findOne({ projectId: { $in: [projectId, null] } }).sort({ projectId: -1 })) || {};
  const offsetHours = sysCfg.channelMaxOffsetHours ?? config.business.visitCountdownHours;
  const expireHours = sysCfg.channelExpireHours ?? config.business.duplicateWindowHours;

  let name, phone, rawPhone, isMasked, company, referrerName, remark, recommendTime;
  recommendTime = body.recommendTime;
  if (!recommendTime) throw new BizError("推荐时间必填", 400);
  if (!isWithinOffset(recommendTime, offsetHours)) {
    throw new BizError(`推荐时间不能晚于系统时间 ${offsetHours} 小时以上`, 400);
  }

  if (type === "A") {
    name = body.name;
    const maskedPhone = body.phone;
    remark = body.remark;
    if (!name) throw new BizError("客户姓名必填", 400);
    if (!maskedPhone) throw new BizError("手机号必填", 400);
    // A类前端传过来的就是脱敏后的字符串（138****1234）
    isMasked = true;
    phone = maskedPhone;
    rawPhone = null; // 不存原号
    if (body.companyId) {
      company = await Company.findOne({ _id: body.companyId, projectId });
      if (!company) throw new BizError("合作公司不存在", 404);
    }
  } else {
    name = body.name;
    const fullPhone = body.phone;
    referrerName = body.referrerName;
    remark = body.remark;
    if (!name) throw new BizError("客户姓名必填", 400);
    if (!fullPhone || !isValidPhone(fullPhone)) throw new BizError("手机号格式不正确", 400);
    if (!referrerName) throw new BizError("推荐人姓名必填", 400);
    // B类强制查重（同项目完整手机号唯一）
    const dup = await Customer.findOne({ projectId, $or: [{ phone: fullPhone, isMasked: false }, { rawPhone: fullPhone }] });
    if (dup) throw new BizError("手机号已存在，无法重复录入", 409);
    isMasked = false;
    phone = fullPhone;
    rawPhone = fullPhone;
  }

  const channelExpireAt = new Date(new Date(recommendTime).getTime() + expireHours * 3600 * 1000);

  const customer = await Customer.create({
    name,
    phone,
    rawPhone,
    isMasked,
    source: type === "A" ? "CHANNEL_COMPANY" : "PERSONAL_REFERRAL",
    status: CUSTOMER_STATUS.UNVISITED,
    visitTime: new Date(recommendTime),
    remark,
    projectId,
    channelUser: req.user._id,
    company: company?._id,
    referrerName,
    channelExpireAt,
  });

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CUSTOMER_CREATE,
    module: "CHANNEL",
    target: name,
    projectId,
    detail: { customerId: customer._id, type },
    ip: req.ip,
  });

  return { data: customer };
};

// GET /api/channel/customers
// 渠道员查看自己推荐的客户
exports.list = async (req, res) => {
  const { projectId } = req.projectContext;
  const channelUser = req.user._id;
  const { page, pageSize, skip } = parsePaging(req.query);
  const { source, visited, startDate, endDate, keyword } = req.query;

  const filter = { projectId, channelUser };
  if (source === "CHANNEL_COMPANY" || source === "PERSONAL_REFERRAL") filter.source = source;
  if (visited === "true") filter.status = { $in: ["ACTIVE", "DEAL"] };
  if (visited === "false") filter.status = "UNVISITED";
  if (startDate || endDate) {
    filter.visitTime = {};
    if (startDate) filter.visitTime.$gte = new Date(startDate);
    if (endDate) filter.visitTime.$lte = new Date(endDate);
  }
  if (keyword) filter.name = new RegExp(keyword, "i");

  const [list, total] = await Promise.all([
    Customer.find(filter)
      .populate("company", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Customer.countDocuments(filter),
  ]);

  // A类手机号脱敏后返回
  const out = list.map((c) => ({
    ...c,
    phone: c.isMasked ? (maskPhone(c.phone) === c.phone ? c.phone : c.phone) : c.phone,
    channelExpireCountdown: c.channelExpireAt ? Math.max(0, new Date(c.channelExpireAt).getTime() - Date.now()) : null,
  }));

  return { data: { list: out, total, page, pageSize } };
};

// GET /api/channel/customer/:id
exports.detail = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) throw new BizError("客户ID无效", 400);
  const { projectId } = req.projectContext;

  const customer = await Customer.findOne({ _id: id, projectId, channelUser: req.user._id })
    .populate("company", "name")
    .populate("owner", "realName username phone")
    .lean();
  if (!customer) throw new BizError("客户不存在", 404);

  return { data: customer };
};

// PUT /api/channel/customer/:id
// 仅未到访未过期可编辑
exports.update = async (req, res) => {
  const { id } = req.params;
  const { projectId } = req.projectContext;
  const customer = await Customer.findOne({ _id: id, projectId, channelUser: req.user._id });
  if (!customer) throw new BizError("客户不存在", 404);
  if (customer.status !== "UNVISITED") {
    throw new BizError("客户已到访或已过期，不可编辑", 400);
  }

  const before = customer.toObject();
  const allowed = ["name", "phone", "remark", "referrerName", "company"];
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
    module: "CHANNEL",
    target: customer.name,
    projectId,
    detail: { customerId: customer._id, changes },
    ip: req.ip,
  });

  return { data: customer };
};

// POST /api/channel/customer/:id/arrive
// 标记已到访：关联接待销售员，状态切换为只读（ACTIVE 归属销售员）
exports.arrive = async (req, res) => {
  const { id } = req.params;
  const { salesId } = req.body || {};
  if (!salesId || !mongoose.isValidObjectId(salesId)) throw new BizError("salesId 无效", 400);

  const { projectId } = req.projectContext;
  const customer = await Customer.findOne({ _id: id, projectId, channelUser: req.user._id });
  if (!customer) throw new BizError("客户不存在", 404);
  if (customer.status !== "UNVISITED") throw new BizError("客户已到访或已过期", 400);

  const User = require("../../models/User");
  const sales = await User.findOne({ _id: salesId, role: "ROLE_SALES", accessibleProjects: projectId });
  if (!sales) throw new BizError("销售员不存在或无该项目权限", 404);

  customer.status = CUSTOMER_STATUS.ACTIVE;
  customer.owner = sales._id;
  customer.lastFollowupAt = new Date();
  customer.channelExpireAt = null;
  await customer.save();

  await writeTransfer({
    customerId: customer._id,
    projectId,
    customerName: customer.name,
    fromUser: req.user._id,
    fromUserName: req.user.realName || req.user.username,
    toUser: sales._id,
    toUserName: sales.realName || sales.username,
    action: TRANSFER_ACTION.ARRIVE,
    reason: "渠道员标记已到访",
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
  });

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CHANNEL_ARRIVE,
    module: "CHANNEL",
    target: customer.name,
    projectId,
    detail: { customerId: customer._id, salesId: sales._id },
    ip: req.ip,
  });

  return { data: customer };
};
