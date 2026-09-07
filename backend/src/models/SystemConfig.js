const { Schema, model } = require("mongoose");
const config = require("../config");

const SystemConfigSchema = new Schema(
  {
    projectId: { type: Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    // 销售员到访时间最大偏移小时
    visitMaxOffsetHours: { type: Number, default: config.business.visitCountdownHours },
    // 渠道推荐时间最大偏移小时
    channelMaxOffsetHours: { type: Number, default: config.business.visitCountdownHours },
    // 无跟进预警天数
    followupReminderDays: { type: Number, default: config.business.followupReminderDays },
    // 无跟进自动入公共池天数
    publicPoolRetentionDays: { type: Number, default: config.business.publicPoolRetentionDays },
    // 渠道自动过期小时（24）
    channelExpireHours: { type: Number, default: config.business.duplicateWindowHours },
    // 过期池保留天数
    expiredPoolRetentionDays: { type: Number, default: config.business.expiredPoolRetentionDays },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

module.exports = model("SystemConfig", SystemConfigSchema);
