const { Schema, model } = require("mongoose");

const ROLE = {
  ROLE_SALES: "ROLE_SALES",
  ROLE_CHANNEL: "ROLE_CHANNEL",
  ROLE_ADMIN: "ROLE_ADMIN",
};

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    realName: { type: String, default: "" },
    phone: { type: String, default: "" },
    avatar: { type: String, default: "" },
    role: {
      type: String,
      enum: Object.values(ROLE),
      required: true,
      index: true,
    },
    accessibleProjects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    currentProject: { type: Schema.Types.ObjectId, ref: "Project", default: null },
    status: { type: String, enum: ["ACTIVE", "DISABLED"], default: "ACTIVE" },
    // 微信小程序绑定
    openid: { type: String, default: null, index: true },
    unionid: { type: String, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  obj.id = obj._id;
  return obj;
};

module.exports = model("User", UserSchema);
module.exports.ROLE = ROLE;
