const { Schema, model } = require("mongoose");

const ExpiredPoolSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    channelUser: { type: Schema.Types.ObjectId, ref: "User", default: null },
    channelUserName: String,
    company: { type: Schema.Types.ObjectId, ref: "Company", default: null },
    companyName: String,
    referrerName: String,
    source: String,
    expiredAt: { type: Date, default: Date.now },
    // 是否已重新报备
    reReported: { type: Boolean, default: false },
    reReportCustomerId: { type: Schema.Types.ObjectId, ref: "Customer", default: null },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

ExpiredPoolSchema.index({ projectId: 1, expiredAt: -1 });
ExpiredPoolSchema.index({ channelUser: 1, archived: 1 });

module.exports = model("ExpiredPool", ExpiredPoolSchema);
