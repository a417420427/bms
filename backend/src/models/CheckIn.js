const { Schema, model } = require("mongoose");

const CheckInSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    distance: { type: Number, required: true }, // 距项目中心点距离（米）
    radius: { type: Number, required: true }, // 打卡时的允许半径
    status: { type: String, enum: ["IN_RANGE", "OUT_OF_RANGE"], required: true },
    remark: String,
    checkinDate: { type: String, required: true, index: true }, // "2026-09-11"（UTC+8 日期）
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// 每人每天每项目限 1 次
CheckInSchema.index({ userId: 1, projectId: 1, checkinDate: 1 }, { unique: true });

module.exports = model("CheckIn", CheckInSchema);
