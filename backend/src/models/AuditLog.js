const { Schema, model } = require("mongoose");

const AuditLogSchema = new Schema(
  {
    operator: { type: Schema.Types.ObjectId, ref: "User", default: null },
    operatorName: String,
    action: { type: String, required: true, index: true },
    module: { type: String, index: true },
    target: String,
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    detail: Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

AuditLogSchema.index({ createdAt: -1 });

// 审计日志禁止物理删除，仅允许查询
AuditLogSchema.methods.deleteOne = function () {
  throw new Error("审计日志禁止删除");
};

module.exports = model("AuditLog", AuditLogSchema);
