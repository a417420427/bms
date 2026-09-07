const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { wrap } = require("../utils/response");
const { auth, tempAuth } = require("../middleware/auth");
const config = require("../config");
const authCtrl = require("../controllers/authController");

// V4: 登录/绑定接口限流，防止暴力破解
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 10,                  // 每个 IP 最多 10 次尝试
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      code: 429,
      message: "尝试过于频繁，请 15 分钟后再试",
      data: null,
    });
  },
});

// 白名单接口：不需要登录
// V3+V4: 登录接口限流 + 统一错误消息（在 controller 内）
router.post("/login", authLimiter, wrap(authCtrl.login));
router.post("/wechat/login", authLimiter, wrap(authCtrl.wechatLogin));
router.post("/wechat/bind", authLimiter, tempAuth, wrap(authCtrl.wechatBind));

// 需要登录
router.post("/wechat/unbind", auth, wrap(authCtrl.wechatUnbind));
router.post("/reset-password", auth, wrap(authCtrl.resetPassword));

// O1: 拉取当前登录用户最新信息
router.get("/me", auth, wrap(authCtrl.me));

// V10: 开发环境专用路由，仅 dev 才注册（生产构建时不存在该路由）
if (config.env === "development") {
  router.post("/dev-switch-user", auth, wrap(authCtrl.devSwitchUser));
}

module.exports = router;
