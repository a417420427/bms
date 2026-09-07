const { Schema, model } = require("mongoose");

const CustomerSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    phone: { type: String, required: true, index: true },
    age: Number,
    source: {
      type: String,
      enum: ["SELF_VISIT", "SELF_DEVELOP", "CHANNEL_COMPANY", "PERSONAL_REFERRAL"],
      required: true,
      index: true,
    },
    intentLevel: {
      type: String,
      enum: ["HIGH", "MEDIUM", "LOW", "NONE"],
      default: "NONE",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "DEAL", "PUBLIC_POOL", "EXPIRED", "UNVISITED"],
      default: "ACTIVE",
      index: true,
    },
    visitTime: Date,
    visitPhotos: [String],
    remark: String,
    // 归属
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true }, // 销售员
    channelUser: { type: Schema.Types.ObjectId, ref: "User", default: null }, // 渠道员
    company: { type: Schema.Types.ObjectId, ref: "Company", default: null }, // 合作公司
    referrerName: String, // B类个人推荐人姓名
    // 跟进
    lastFollowupAt: Date,
    followupCount: { type: Number, default: 0 },
    // 渠道倒计时（推荐时间 + 24h）
    channelExpireAt: Date,
    // 冲突录入关联审批
    conflictApproval: { type: Schema.Types.ObjectId, ref: "Approval", default: null },
    // 脱敏标识（A类渠道推荐前三后四脱敏）
    isMasked: { type: Boolean, default: false },
    // 原始手机号（脱敏前的全号，仅管理员可见）
    rawPhone: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

CustomerSchema.index({ projectId: 1, phone: 1 });
CustomerSchema.index({ projectId: 1, owner: 1, status: 1 });
CustomerSchema.index({ projectId: 1, channelUser: 1, status: 1 });

module.exports = model("Customer", CustomerSchema);
