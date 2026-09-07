const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const { BizError } = require("../utils/response");
const { isValidPhone } = require("../utils/validators");
const { writeAudit } = require("../utils/audit");

function signToken(user) {
  return jwt.sign({ uid: user._id, role: user.role, type: "access" }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

function signTempToken(payload) {
  return jwt.sign({ ...payload, type: "temp" }, config.jwt.secret, { expiresIn: "30m" });
}

// 用户数据序列化（前端 UserInfoProp 结构）
function serializeUser(user) {
  return {
    id: user._id,
    _id: user._id,
    username: user.username,
    realName: user.realName,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar || "",
    currentProject: user.currentProject
      ? {
          _id: user.currentProject._id || user.currentProject,
          name: user.currentProject.name,
          code: user.currentProject.code,
          address: user.currentProject.address,
          developer: user.currentProject.developer,
        }
      : null,
    accessibleProjects: (user.accessibleProjects || []).map((p) => ({
      _id: p._id || p,
      name: p.name,
      code: p.code,
      address: p.address,
      developer: p.developer,
    })),
  };
}

// POST /api/auth/login
exports.login = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) throw new BizError("账号或密码不能为空", 400);

  const user = await User.findOne({ username }).populate("currentProject accessibleProjects");
  if (!user) throw new BizError("账号不存在", 404);
  if (user.status === "DISABLED") throw new BizError("账号已禁用", 403);

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new BizError("密码错误", 400);

  const token = signToken(user);
  await writeAudit({
    operator: user._id,
    operatorName: user.realName || user.username,
    action: "LOGIN",
    module: "AUTH",
    ip: req.ip,
  });

  return { data: { user: serializeUser(user), token } };
};

// POST /api/auth/wechat/login
// 用 wx code 换 openid，返回已绑定账号的 token；未绑定返回 tempToken
exports.wechatLogin = async (req, res) => {
  const { code } = req.body || {};
  if (!code) throw new BizError("缺少微信 code", 400);

  let openid = "";
  // 真实部署应调用 https://api.weixin.qq.com/sns/jscode2session
  // 开发模式：未配置 WX_APPID 时返回固定 openid，保证绑定后能自动登录
  if (config.wechat.appid && config.wechat.secret) {
    const resp = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${config.wechat.appid}&secret=${config.wechat.secret}&js_code=${code}&grant_type=authorization_code`
    );
    const data = await resp.json();
    if (!data.openid) throw new BizError("微信登录失败: " + (data.errmsg || "unknown"), 400);
    openid = data.openid;
  } else {
    openid = "wx_dev_mock";
  }

  const user = await User.findOne({ openid }).populate("currentProject accessibleProjects");
  if (user) {
    if (user.status === "DISABLED") throw new BizError("账号已禁用", 403);
    return { data: { bound: true, user: serializeUser(user), token: signToken(user) } };
  }
  // 未绑定，返回 tempToken 供绑定流程使用
  return { data: { bound: false, tempToken: signTempToken({ openid }), openid } };
};

// POST /api/auth/wechat/bind
exports.wechatBind = async (req, res) => {
  const { tempToken, username, password } = req.body || {};
  if (!tempToken || !username || !password) throw new BizError("参数不完整", 400);

  let payload;
  try {
    payload = jwt.verify(tempToken, config.jwt.secret);
  } catch (e) {
    throw new BizError("临时凭证已失效", 401);
  }
  if (payload.type !== "temp" || !payload.openid) throw new BizError("凭证无效", 401);

  const user = await User.findOne({ username }).populate("currentProject accessibleProjects");
  if (!user) throw new BizError("账号不存在", 404);
  if (user.status === "DISABLED") throw new BizError("账号已禁用", 403);

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new BizError("密码错误", 400);

  // 绑定前解除其他账号的同一 openid，避免一个 openid 绑多个账号导致下次登录命中不确定
  await User.updateMany(
    { openid: payload.openid, _id: { $ne: user._id } },
    { $set: { openid: null } }
  );

  user.openid = payload.openid;
  await user.save();

  return { data: { user: serializeUser(user), token: signToken(user) } };
};

// POST /api/auth/wechat/unbind
exports.wechatUnbind = async (req, res) => {
  if (!req.user) throw new BizError("未登录", 401);
  req.user.openid = null;
  await req.user.save();
  return { data: { ok: true } };
};

// POST /api/auth/reset-password
// 修改密码（旧密码 + 新密码）
exports.resetPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) throw new BizError("参数不完整", 400);
  if (newPassword.length < 6) throw new BizError("新密码至少 6 位", 400);

  const user = await User.findById(req.user._id);
  if (!user) throw new BizError("用户不存在", 404);

  const ok = await bcrypt.compare(oldPassword, user.password);
  if (!ok) throw new BizError("原密码错误", 400);

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  await writeAudit({
    operator: user._id,
    operatorName: user.realName || user.username,
    action: "RESET_PASSWORD",
    module: "AUTH",
    ip: req.ip,
  });

  return { data: { ok: true } };
};

// POST /api/auth/dev-switch-user  开发环境专用：按 username 直接换 token，便于前端切换角色测试
exports.devSwitchUser = async (req, res) => {
  if (config.env !== "development") throw new BizError("仅开发环境可用", 403);
  const { username } = req.body || {};
  if (!username) throw new BizError("缺少 username", 400);

  const user = await User.findOne({ username }).populate("currentProject accessibleProjects");
  if (!user) throw new BizError("用户不存在", 404);
  if (user.status === "DISABLED") throw new BizError("账号已禁用", 403);

  return { data: { user: serializeUser(user), token: signToken(user) } };
};

module.exports = { ...exports, serializeUser, signToken, signTempToken };
