const { Schema, model } = require("mongoose");

const APPROVAL_TYPE = {
  CUSTOMER_CONFLICT: "CUSTOMER_CONFLICT",
  CLAIM_PUBLIC: "CLAIM_PUBLIC",
  CLAIM_UNVISITED: "CLAIM_UNVISITED",
};

const APPROVAL_RESULT = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

const ApprovalSchema = new Schema(
  {
    type: {
      type: String,
      enum: Object.values(APPROVAL_TYPE),
      required: true,
      index: true,
    },
    result: {
      type: String,
      enum: Object.values(APPROVAL_RESULT),
      default: "PENDING",
      index: true,
    },
    applicant: { type: Schema.Types.ObjectId, ref: "User", required: true },
    applicantName: String,
    // 申请关联客户
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    // 公共池条目（CLAIM_PUBLIC 用）
    publicPoolId: { type: Schema.Types.ObjectId, ref: "PublicPool", default: null },
    // 渠道未到访条目（CLAIM_UNVISITED 用）
    unvisitedCustomerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    // 申请提交时的快照数据
    snapshot: Schema.Types.Mixed,
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    remark: String,
    // 处理
    handler: { type: Schema.Types.ObjectId, ref: "User", default: null },
    handlerName: String,
    handledAt: Date,
    handleRemark: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ApprovalSchema.index({ type: 1, result: 1 });
ApprovalSchema.index({ projectId: 1, result: 1 });

module.exports = model("Approval", ApprovalSchema);
module.exports.APPROVAL_TYPE = APPROVAL_TYPE;
module.exports.APPROVAL_RESULT = APPROVAL_RESULT;
