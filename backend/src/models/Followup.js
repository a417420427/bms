const { Schema, model } = require("mongoose");

const FollowupSchema = new Schema(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    method: {
      type: String,
      enum: ["PHONE", "WECHAT", "FACE"],
      required: true,
    },
    content: { type: String, required: true },
    result: String,
    followupTime: { type: Date, required: true },
    operator: { type: Schema.Types.ObjectId, ref: "User", required: true },
    operatorName: String,
    photos: [String],
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

FollowupSchema.index({ customerId: 1, followupTime: -1 });

module.exports = model("Followup", FollowupSchema);
