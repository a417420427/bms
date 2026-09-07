const express = require("express");
const router = express.Router();
const { wrap } = require("../utils/response");
const { auth, tempAuth } = require("../middleware/auth");
const authCtrl = require("../controllers/authController");

// 白名单接口：不需要登录
router.post("/login", wrap(authCtrl.login));
router.post("/wechat/login", wrap(authCtrl.wechatLogin));
router.post("/wechat/bind", tempAuth, wrap(authCtrl.wechatBind));

// 需要登录
router.post("/wechat/unbind", auth, wrap(authCtrl.wechatUnbind));
router.post("/reset-password", auth, wrap(authCtrl.resetPassword));

// 开发环境专用：切换用户（仅 dev）
router.post("/dev-switch-user", auth, wrap(authCtrl.devSwitchUser));

module.exports = router;
