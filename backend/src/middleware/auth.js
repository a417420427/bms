const jwt = require("jsonwebtoken");
const config = require("../config");
const User = require("../models/User");
const { fail } = require("../utils/response");

// 校验 JWT，把 user 挂到 req.user
async function auth(req, res, next) {
  const authHeader = req.header("Authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json(fail("未登录", 401));
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(payload.uid).populate("currentProject accessibleProjects");
    if (!user) return res.status(401).json(fail("用户不存在", 401));
    if (user.status === "DISABLED") return res.status(403).json(fail("账号已禁用", 403));
    req.user = user;
    req.tokenPayload = payload;
    next();
  } catch (e) {
    if (e.name === "TokenExpiredError") {
      return res.status(401).json(fail("登录已过期，请重新登录", 401));
    }
    return res.status(401).json(fail("无效的登录凭证", 401));
  }
}

// 临时 token 中间件：用于微信绑定场景
async function tempAuth(req, res, next) {
  const authHeader = req.header("Authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.body.tempToken;
  if (!token) return res.status(401).json(fail("缺少临时凭证", 401));
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    if (payload.type !== "temp") {
      return res.status(401).json(fail("凭证类型错误", 401));
    }
    req.tempPayload = payload;
    next();
  } catch (e) {
    return res.status(401).json(fail("临时凭证已失效", 401));
  }
}

module.exports = { auth, tempAuth };
