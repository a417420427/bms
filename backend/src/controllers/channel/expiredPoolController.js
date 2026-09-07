const mongoose = require("mongoose");
const ExpiredPool = require("../../models/ExpiredPool");
const Customer = require("../../models/Customer");
const SystemConfig = require("../../models/SystemConfig");
const config = require("../../config");
const { BizError } = require("../../utils/response");
const { parsePaging } = require("../../utils/validators");
const { writeAudit } = require("../../utils/audit");
const { writeTransfer } = require("../../utils/transferLog");
const { AUDIT_ACTION, TRANSFER_ACTION, CUSTOMER_STATUS } = require("../../utils/constants");

// GET /api/channel/expired-pool
// 渠道员自己的过期池
exports.list = async (req, res) => {
  const { projectId } = req.projectContext;
  const channelUser = req.user._id;
  const { page, pageSize, skip } = parsePaging(req.query);
  const { keyword } = req.query;

  const filter = { projectId, channelUser, archived: { $ne: true } };
  if (keyword) filter.$or = [
    { companyName: new RegExp(keyword, "i") },
    { referrerName: new RegExp(keyword, "i") },
  ];

  const [list, total] = await Promise.all([
    ExpiredPool.find(filter)
      .populate("customerId", "name phone source status visitTime company referrerName channelUser")
      .sort({ expiredAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    ExpiredPool.countDocuments(filter),
  ]);

  const out = list.map((p) => ({
    _id: p._id,
    customer: p.customerId,
    customerId: p.customerId?._id,
    channelUser: p.channelUser,
    channelUserName: p.channelUserName,
    company: p.company,
    companyName: p.companyName,
    referrerName: p.referrerName,
    source: p.source,
    expiredAt: p.expiredAt,
    reReported: p.reReported,
  }));

  return { data: { list: out, total, page, pageSize } };
};

// POST /api/channel/report-expired
// 重新报备：生成全新报备记录，重新开启24h倒计时；旧记录归档保留
exports.reReport = async (req, res) => {
  const { expiredPoolId } = req.body || {};
  if (!expiredPoolId || !mongoose.isValidObjectId(expiredPoolId)) {
    throw new BizError("expiredPoolId 无效", 400);
  }

  const { projectId } = req.projectContext;
  const expired = await ExpiredPool.findOne({ _id: expiredPoolId, projectId, channelUser: req.user._id });
  if (!expired) throw new BizError("过期池中无此客户", 404);
  if (expired.reReported) throw new BizError("该客户已重新报备过", 400);

  // 获取原客户快照
  const oldCustomer = await Customer.findById(expired.customerId).lean();
  if (!oldCustomer) throw new BizError("原始客户记录已删除", 404);

  const sysCfg = (await SystemConfig.findOne({ projectId: { $in: [projectId, null] } }).sort({ projectId: -1 })) || {};
  const expireHours = sysCfg.channelExpireHours ?? config.business.duplicateWindowHours;
  const now = new Date();
  const channelExpireAt = new Date(now.getTime() + expireHours * 3600 * 1000);

  // 创建全新报备记录
  const newCustomer = await Customer.create({
    name: oldCustomer.name,
    phone: oldCustomer.phone,
    rawPhone: oldCustomer.rawPhone,
    isMasked: oldCustomer.isMasked,
    source: oldCustomer.source,
    status: CUSTOMER_STATUS.UNVISITED,
    visitTime: now,
    remark: oldCustomer.remark,
    projectId,
    channelUser: req.user._id,
    company: oldCustomer.company,
    referrerName: oldCustomer.referrerName,
    channelExpireAt,
  });

  // 旧记录归档
  expired.reReported = true;
  expired.reReportCustomerId = newCustomer._id;
  expired.archived = true;
  await expired.save();

  await writeTransfer({
    customerId: newCustomer._id,
    projectId,
    customerName: newCustomer.name,
    fromUser: req.user._id,
    fromUserName: req.user.realName || req.user.username,
    action: TRANSFER_ACTION.RE_REPORT,
    reason: `重新报备，源客户 ${oldCustomer._id}`,
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
  });

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.CHANNEL_RE_REPORT,
    module: "CHANNEL",
    target: newCustomer.name,
    projectId,
    detail: { newCustomerId: newCustomer._id, expiredPoolId: expired._id },
    ip: req.ip,
  });

  return { data: { customer: newCustomer, message: "重新报备成功，已开启新的24小时到访倒计时" } };
};
