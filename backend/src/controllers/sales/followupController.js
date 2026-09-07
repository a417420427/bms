const mongoose = require("mongoose");
const Followup = require("../../models/Followup");
const Customer = require("../../models/Customer");
const { BizError } = require("../../utils/response");
const { writeAudit } = require("../../utils/audit");
const { AUDIT_ACTION, FOLLOWUP_METHOD } = require("../../utils/constants");

// GET /api/sales/followups/:customerId
exports.list = async (req, res) => {
  const { customerId } = req.params;
  if (!mongoose.isValidObjectId(customerId)) throw new BizError("客户ID无效", 400);
  const { projectId } = req.projectContext;

  const customer = await Customer.findOne({ _id: customerId, projectId }).lean();
  if (!customer) throw new BizError("客户不存在", 404);

  // 销售员只能查看归属自己的客户的跟进记录
  if (customer.owner?.toString() !== req.user._id.toString() && customer.status !== "PUBLIC_POOL") {
    throw new BizError("无权查看", 403);
  }

  const list = await Followup.find({ customerId, projectId })
    .populate("operator", "realName username")
    .sort({ followupTime: -1 })
    .lean();

  return { data: list };
};

// POST /api/sales/followup
exports.create = async (req, res) => {
  const { customerId, method, content, result, followupTime, photos = [] } = req.body || {};
  if (!customerId) throw new BizError("customerId 必填", 400);
  if (!method || !Object.values(FOLLOWUP_METHOD).includes(method)) {
    throw new BizError("跟进方式不合法", 400);
  }
  if (!content) throw new BizError("跟进内容必填", 400);
  if (!followupTime) throw new BizError("跟进时间必填", 400);

  const { projectId } = req.projectContext;
  const customer = await Customer.findOne({ _id: customerId, projectId, owner: req.user._id });
  if (!customer) throw new BizError("客户不存在或无权操作", 404);

  const followup = await Followup.create({
    customerId,
    projectId,
    method,
    content,
    result,
    followupTime: new Date(followupTime),
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    photos,
  });

  // 更新客户的最近跟进时间
  customer.lastFollowupAt = new Date(followupTime);
  customer.followupCount = (customer.followupCount || 0) + 1;
  await customer.save();

  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: AUDIT_ACTION.FOLLOWUP_CREATE,
    module: "SALES",
    target: customer.name,
    projectId,
    detail: { customerId, followupId: followup._id },
    ip: req.ip,
  });

  return { data: followup };
};
