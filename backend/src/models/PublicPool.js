const { Schema, model } = require("mongoose");

const PublicPoolSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    reason: String, // 进入公共池原因
    previousOwner: { type: Schema.Types.ObjectId, ref: "User", default: null },
    releasedAt: { type: Date, default: Date.now },
    // 是否处于待审批状态（避免重复申请）
    pendingApprovalId: { type: Schema.Types.ObjectId, ref: "Approval", default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

PublicPoolSchema.index({ projectId: 1, releasedAt: -1 });

module.exports = model("PublicPool", PublicPoolSchema);
