const { Schema, model } = require("mongoose");

const TransferLogSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    customerName: String,
    fromUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
    fromUserName: String,
    toUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
    toUserName: String,
    action: { type: String, required: true }, // ASSIGN / MOVE_PUBLIC / CLAIM / EXPIRE / RE_REPORT / APPROVE / ARRIVE
    reason: String,
    operator: { type: Schema.Types.ObjectId, ref: "User", default: null },
    operatorName: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

TransferLogSchema.index({ customerId: 1, createdAt: -1 });
TransferLogSchema.index({ projectId: 1, createdAt: -1 });

module.exports = model("TransferLog", TransferLogSchema);
