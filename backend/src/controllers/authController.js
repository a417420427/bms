const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const { BizError } = require("../utils/response");
const { isValidPhone } = require("../utils/validators");
const { writeAudit } = require("../utils/audit");
const { BCRYPT_ROUNDS } = require("../utils/constants");

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
  // V3: 统一返回"账号或密码错误"，避免用户名枚举
  if (!user) throw new BizError("账号或密码错误", 400);
  if (user.status === "DISABLED") throw new BizError("账号已禁用", 403);

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new BizError("账号或密码错误", 400);

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
  // V2: 生产环境必须配置微信凭证，否则拒绝服务
  if (config.wechat.appid && config.wechat.secret) {
    const resp = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?appid=${config.wechat.appid}&secret=${config.wechat.secret}&js_code=${code}&grant_type=authorization_code`
    );
    const data = await resp.json();
    if (!data.openid) throw new BizError("微信登录失败: " + (data.errmsg || "unknown"), 400);
    openid = data.openid;
  } else {
    if (config.env === "production") {
      throw new BizError("微信小程序未配置，无法登录", 500);
    }
    openid = "wx_dev_mock";
  }

  const user = await User.findOne({ openid }).populate("currentProject accessibleProjects");
  console.log('[wechatLogin] openid:', openid, 'matched user:', user ? `${user.username}(${user.role})` : 'null');
  if (user) {
    if (user.status === "DISABLED") throw new BizError("账号已禁用", 403);
    // V11: 微信登录补审计日志
    await writeAudit({
      operator: user._id,
      operatorName: user.realName || user.username,
      action: "WECHAT_LOGIN",
      module: "AUTH",
      ip: req.ip,
    });
    return { data: { bound: true, user: serializeUser(user), token: signToken(user) } };
  }
  // V9: 不再返回 openid 给前端，前端只需 tempToken
  return { data: { bound: false, tempToken: signTempToken({ openid }) } };
};

// POST /api/auth/wechat/bind
// V8: tempAuth 中间件已验证 tempToken，这里直接用 req.tempPayload
exports.wechatBind = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) throw new BizError("参数不完整", 400);

  const payload = req.tempPayload;
  if (!payload || !payload.openid) throw new BizError("凭证无效", 401);

  const user = await User.findOne({ username }).populate("currentProject accessibleProjects");
  // V3: 统一错误消息，避免用户名枚举
  if (!user) throw new BizError("账号或密码错误", 400);
  if (user.status === "DISABLED") throw new BizError("账号已禁用", 403);

  // O6 限制已移除：允许管理员通过微信小程序绑定（仅本地/测试场景）
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new BizError("账号或密码错误", 400);

  // 绑定前解除其他账号的同一 openid，避免一个 openid 绑多个账号导致下次登录命中不确定
  await User.updateMany(
    { openid: payload.openid, _id: { $ne: user._id } },
    { $set: { openid: null } }
  );

  user.openid = payload.openid;
  await user.save();

  // V11: 微信绑定补审计日志
  await writeAudit({
    operator: user._id,
    operatorName: user.realName || user.username,
    action: "WECHAT_BIND",
    module: "AUTH",
    ip: req.ip,
  });

  return { data: { user: serializeUser(user), token: signToken(user) } };
};

// POST /api/auth/wechat/unbind
exports.wechatUnbind = async (req, res) => {
  if (!req.user) throw new BizError("未登录", 401);
  req.user.openid = null;
  await req.user.save();
  // V11: 微信解绑补审计日志
  await writeAudit({
    operator: req.user._id,
    operatorName: req.user.realName || req.user.username,
    action: "WECHAT_UNBIND",
    module: "AUTH",
    ip: req.ip,
  });
  return { data: { ok: true } };
};

// POST /api/auth/reset-password
// 修改密码（旧密码 + 新密码）
exports.resetPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if (!oldPassword || !newPassword) throw new BizError("参数不完整", 400);
  // V13: 密码强度校验：至少 8 位且包含字母和数字
  const strongRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
  if (!strongRegex.test(newPassword)) {
    throw new BizError("新密码至少 8 位且包含字母和数字", 400);
  }

  const user = await User.findById(req.user._id);
  if (!user) throw new BizError("用户不存在", 404);

  const ok = await bcrypt.compare(oldPassword, user.password);
  if (!ok) throw new BizError("原密码错误", 400);

  user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
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

// GET /api/auth/me  O1: 拉取当前用户最新信息
exports.me = async (req, res) => {
  return { data: serializeUser(req.user) };
};

// POST /api/auth/dev-switch-user  开发环境专用：按 username 直接换 token，便于前端切换角色测试
// V10: 仅开发环境注册路由（在 routes/auth.js 里控制），这里仍保留 env 校验作为双保险
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
