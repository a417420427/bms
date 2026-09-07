const { Schema, model } = require("mongoose");

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true, index: true },
    code: { type: String, index: true },
    address: String,
    developer: String,
    status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE" },
    remark: String,
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

module.exports = model("Project", ProjectSchema);
