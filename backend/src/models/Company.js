const { Schema, model } = require("mongoose");

const CompanySchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    contactName: String,
    contactPhone: String,
    address: String,
    remark: String,
    status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE" },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

CompanySchema.index({ projectId: 1, name: 1 });

module.exports = model("Company", CompanySchema);
