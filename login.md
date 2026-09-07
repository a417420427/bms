# 登录逻辑梳理与漏洞分析

> 范围：前端 `mp/` + 后端 `backend/` 的登录/绑定/退出/路由分发全链路
> 输出：当前流程梳理 + 漏洞清单 + 优化建议

---

## 一、当前登录流程

### 1.1 启动流程

```
小程序启动
  ↓
app.config.ts pages[0] = /pages/sales/dashboard/index
  ↓
app.tsx useLaunch → initAppData()
  ├─ getToken() 为空 → handleWechatLogin()           ── 走微信登录
  └─ getToken() 有值 → 读本地 userInfo → reLaunch(ROLE_HOME[role])
                       ├─ ROLE_SALES   → /pages/sales/dashboard
                       ├─ ROLE_CHANNEL → /pages/channel/dashboard
                       └─ ROLE_ADMIN   → /pages/admin/dashboard
```

### 1.2 微信登录 handleWechatLogin（[auth.ts](file:///Users/zlzk/Dev/personal/bms/mp/src/services/auth.ts)）

```
Taro.login() → code
  ↓
POST /api/auth/wechat/login { code }
  ↓
后端（authController.wechatLogin）
  ├─ 配了 WX_APPID → 调微信 jscode2session 拿 openid
  └─ 没配 → mock openid = "wx_dev_mock"
  ↓
User.findOne({ openid })
  ├─ 找到 → { bound: true, user, token }            ── 已绑定，自动登录
  └─ 没找到 → { bound: false, tempToken, openid }   ── 未绑定，跳绑定页
  ↓
前端
  ├─ bound=true → setToken + setLocalUserInfo + reLaunch(ROLE_HOME[role])
  └─ bound=false → redirectTo /pages/authPage/index?tempToken=xxx
```

### 1.3 绑定流程（[authPage/index.tsx](file:///Users/zlzk/Dev/personal/bms/mp/src/pages/authPage/index.tsx)）

```
用户输入 username + password
  ↓
POST /api/auth/wechat/bind { tempToken, username, password }
  ↓
后端（authController.wechatBind）
  ├─ tempAuth 中间件验证 tempToken（type=temp, openid 存在）
  ├─ User.findOne({ username })，bcrypt.compare(password, user.password)
  ├─ 清除其他用户的同 openid（避免冲突）
  ├─ user.openid = payload.openid
  └─ 返回 { user, token }
  ↓
前端
  setToken + setLocalUserInfo + reLaunch(ROLE_HOME[role])
```

### 1.4 退出登录（[auth.ts#logout](file:///Users/zlzk/Dev/personal/bms/mp/src/services/auth.ts#L68-L73)）

```
clearToken()                          // 只清本地 token
eventBus.emit('userInfoUpdate', {})   // 通知 tabBar 刷新
reLaunch('/pages/authPage/index')     // 跳登录页
```

注意：
- **没有清除 LOCAL_USER_INFO**（用户信息残留）
- **没有调后端 unbind**（openid 仍绑在用户上）
- **没有审计日志**

### 1.5 请求拦截（[request.ts](file:///Users/zlzk/Dev/personal/bms/mp/src/services/request.ts)）

- 白名单：`/auth/login`、`/auth/wechat/login`、`/auth/wechat/bind`
- 无 token + 非白名单 → 直接 `handleWechatLogin()` + reject
- 后端返回 `code: 401` → `clearToken()` + `handleWechatLogin()` + reject
- 后端返回 `code !== 0` → toast 提示 + reject

### 1.6 后端 auth 中间件（[middleware/auth.js](file:///Users/zlzk/Dev/personal/bms/backend/src/middleware/auth.js)）

```
Authorization: Bearer <token>
  ↓
jwt.verify(token, JWT_SECRET)
  ├─ TokenExpiredError → 401 "登录已过期"
  ├─ 其他错误 → 401 "无效的登录凭证"
  └─ 成功 → User.findById(payload.uid)
            ├─ 不存在 → 401
            ├─ status=DISABLED → 403
            └─ 挂 req.user
```

---

## 二、漏洞清单（按严重度）

### 严重

#### V1. JWT_SECRET 默认值兜底

**位置**：[config/index.js#L8](file:///Users/zlzk/Dev/personal/bms/backend/src/config/index.js#L8)

```js
secret: process.env.JWT_SECRET || "dev-secret-change-me"
```

**风险**：生产环境如果忘记设置 `JWT_SECRET` 环境变量，会用默认值 `"dev-secret-change-me"`。攻击者知道 secret 后可伪造任意用户（包括 admin）的 token，完全接管系统。

**修复**：生产环境强制校验
```js
const secret = process.env.JWT_SECRET;
if (!secret && config.env === "production") {
  throw new Error("JWT_SECRET 必须配置");
}
```

#### V2. mock openid 固定为 "wx_dev_mock"

**位置**：[authController.js#L88-L90](file:///Users/zlzk/Dev/personal/bms/backend/src/controllers/authController.js#L88-L90)

```js
if (config.wechat.appid && config.wechat.secret) {
  // 真实流程
} else {
  openid = "wx_dev_mock";
}
```

**风险**：生产环境如果忘记配置 `WX_APPID`/`WX_SECRET`，所有用户都会拿到同一个 openid `"wx_dev_mock"`。一旦任意一个账号绑定后，所有用户都能直接登录该账号，权限完全失控。

**修复**：生产环境必须配置微信凭证
```js
if (!config.wechat.appid || !config.wechat.secret) {
  if (config.env === "production") {
    throw new BizError("微信小程序未配置", 500);
  }
  openid = "wx_dev_mock";
} else {
  // 调微信接口
}
```

#### V3. /api/auth/login 暴露用户名是否存在

**位置**：[authController.js#L53-L58](file:///Users/zlzk/Dev/personal/bms/backend/src/controllers/authController.js#L53-L58)

```js
if (!user) throw new BizError("账号不存在", 404);
// ...
if (!ok) throw new BizError("密码错误", 400);
```

**风险**：攻击者可以通过返回的错误消息判断用户名是否存在，进行用户名枚举，再针对性暴力破解密码。

**修复**：统一返回错误消息
```js
if (!user || !(await bcrypt.compare(password, user.password))) {
  throw new BizError("账号或密码错误", 400);
}
```

#### V4. 登录/绑定接口无限流

**位置**：[auth.js 路由](file:///Users/zlzk/Dev/personal/bms/backend/src/routes/auth.js)

- `POST /api/auth/login`：可暴力破解密码
- `POST /api/auth/wechat/bind`：拿到 tempToken 后 30 分钟内可无限试密码

**修复**：加 rate limit
```js
const rateLimit = require("express-rate-limit");
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { code: 429, message: "尝试过于频繁，请稍后再试" }
});
router.post("/login", loginLimiter, wrap(authCtrl.login));
router.post("/wechat/bind", loginLimiter, tempAuth, wrap(authCtrl.wechatBind));
```

### 中等

#### V5. logout 无法真正退出

**位置**：[auth.ts#L68-L73](file:///Users/zlzk/Dev/personal/bms/mp/src/services/auth.ts#L68-L73)

```js
export function logout() {
  clearToken();                 // 只清本地 token
  eventBus.emit('userInfoUpdate', getLocalUserInfo());
  Taro.reLaunch({ url: "/pages/authPage/index" });
}
```

**问题**：
1. **没清 LOCAL_USER_INFO**：下次 `getLocalUserInfo()` 仍返回旧用户信息
2. **没调后端 unbind**：openid 仍绑在用户上，下次 `handleWechatLogin` 会直接返回 bound=true + token，"退出"等于没退出
3. **跳到 authPage 但没带 tempToken**：authPage 显示绑定表单，但用户点"重新获取凭证"才能拿到 tempToken

**修复**：
```js
export async function logout() {
  try {
    await wechatUnbind();  // 调后端解绑 openid
  } catch (e) {}
  clearToken();
  clearLocalUserInfo();  // 清本地用户信息
  Taro.reLaunch({ url: "/pages/authPage/index" });
}
```

#### V6. 启动页 reLaunch 期间会触发 403

**位置**：[app.config.ts pages[0]](file:///Users/zlzk/Dev/personal/bms/mp/src/app.config.ts) + [app.tsx#L48-L57](file:///Users/zlzk/Dev/personal/bms/mp/src/app.tsx#L48-L57)

**问题**：`pages[0]` 是 `/pages/sales/dashboard/index`，所有角色启动都会先进这个页面。如果用户是 admin/channel：
1. sales/dashboard 短暂加载，触发 `useEffect` 请求 `/api/sales/dashboard`
2. app.tsx 检测到 token 是 admin 的，`reLaunch` 到 admin/dashboard
3. 但 sales/dashboard 的请求已经发出，被 onlySales 中间件拒绝 → 403 toast 弹出

**修复**：用独立的启动路由守卫页作为 `pages[0]`
```ts
// pages/launch/index.tsx
export default function Launch() {
  useEffect(() => {
    const token = getToken();
    if (!token) {
      handleWechatLogin();
      return;
    }
    const userInfo = getLocalUserInfo();
    Taro.reLaunch({ url: ROLE_HOME[userInfo.role] || ROLE_HOME.ROLE_SALES });
  }, []);
  return <View>加载中...</View>;
}
```
然后 `app.config.ts` 改 `pages[0] = 'pages/launch/index'`，sales/dashboard 不再是启动页，避免误触发请求。

#### V7. 有 token 时不验证有效性

**位置**：[app.tsx#L42-L57](file:///Users/zlzk/Dev/personal/bms/mp/src/app.tsx#L42-L57)

**问题**：启动时只检查本地 `getToken()` 是否有值，不验证 token 是否过期或用户是否被禁用。如果 token 已过期：
1. 跳到 ROLE_HOME[role] 页面
2. 页面请求业务接口 → 401
3. request.ts 拦截器调 `handleWechatLogin()` → 走微信登录
4. 如果 openid 还绑着 → 自动登录成功 → 跳 ROLE_HOME[role]

整个流程会经历一次"假性登录"再"真登录"，用户体验差，控制台一堆 401。

**修复**：启动时调一次 `/api/auth/me` 或 `/api/user/info` 验证 token
```js
const initAppData = async () => {
  const token = getToken();
  if (!token) {
    handleWechatLogin();
    return;
  }
  try {
    const user = await getMe();  // GET /api/auth/me
    setLocalUserInfo(user);
    Taro.reLaunch({ url: ROLE_HOME[user.role] || ROLE_HOME.ROLE_SALES });
  } catch (e) {
    clearToken();
    handleWechatLogin();
  }
};
```

#### V8. wechatBind 重复验证 tempToken

**位置**：[routes/auth.js#L10](file:///Users/zlzk/Dev/personal/bms/backend/src/routes/auth.js#L10) + [authController.js#L106-L112](file:///Users/zlzk/Dev/personal/bms/backend/src/controllers/authController.js#L106-L112)

```js
router.post("/wechat/bind", tempAuth, wrap(authCtrl.wechatBind));
// tempAuth 已经验证 tempToken，挂 req.tempPayload
// wechatBind 又自己 jwt.verify(tempToken) 一次
```

**修复**：wechatBind 直接用 `req.tempPayload`
```js
exports.wechatBind = async (req, res) => {
  const { username, password } = req.body || {};
  const payload = req.tempPayload;  // tempAuth 已验证
  // ...
};
```

#### V9. wechatLogin 返回 openid 给前端

**位置**：[authController.js#L98](file:///Users/zlzk/Dev/personal/bms/backend/src/controllers/authController.js#L98)

```js
return { data: { bound: false, tempToken: signTempToken({ openid }), openid } };
```

**问题**：openid 是微信用户唯一标识，属于敏感信息。生产环境不应返回给前端，前端也不需要（只用 tempToken）。

**修复**：去掉返回的 openid
```js
return { data: { bound: false, tempToken: signTempToken({ openid }) } };
```

#### V10. devSwitchUser 接口残留

**位置**：[authController.js#L168-L179](file:///Users/zlzk/Dev/personal/bms/backend/src/controllers/authController.js#L168-L179) + [routes/auth.js#L17](file:///Users/zlzk/Dev/personal/bms/backend/src/routes/auth.js#L17)

**问题**：
- 虽然检查 `env === "development"`，但代码进生产构建
- 任何登录用户可换取任意 username 的 token（包括 admin），开发环境一旦外网可达，权限完全失控
- 应该在构建时直接剔除

**修复**：
```js
// 仅在 dev 才注册路由
if (config.env === "development") {
  router.post("/dev-switch-user", auth, wrap(authCtrl.devSwitchUser));
}
```
或者用单独的 dev 路由文件，生产构建时排除。

### 轻微

#### V11. wechatLogin/wechatBind/wechatUnbind 缺少审计日志

**位置**：[authController.js](file:///Users/zlzk/Dev/personal/bms/backend/src/controllers/authController.js)

**问题**：只有 `/api/auth/login` 和 `/api/auth/reset-password` 写了 AUDIT 日志，微信登录/绑定/解绑没有审计。无法追踪"谁在什么时候绑定了微信"。

**修复**：
```js
// wechatLogin 已绑定时
await writeAudit({ operator: user._id, operatorName: user.realName, action: "WECHAT_LOGIN", module: "AUTH", ip: req.ip });

// wechatBind 成功后
await writeAudit({ operator: user._id, operatorName: user.realName, action: "WECHAT_BIND", module: "AUTH", ip: req.ip });

// wechatUnbind
await writeAudit({ operator: req.user._id, operatorName: req.user.realName, action: "WECHAT_UNBIND", module: "AUTH", ip: req.ip });
```

#### V12. bcrypt rounds = 10 偏低

**位置**：[authController.js#L154](file:///Users/zlzk/Dev/personal/bms/backend/src/controllers/authController.js#L154) + [scripts/seed.js](file:///Users/zlzk/Dev/personal/bms/backend/src/scripts/seed.js)

**建议**：提到 12，增加暴力破解成本（每次 hash 多约 100ms，可接受）。

#### V13. resetPassword 强度校验过弱

**位置**：[authController.js#L146](file:///Users/zlzk/Dev/personal/bms/backend/src/controllers/authController.js#L146)

```js
if (newPassword.length < 6) throw new BizError("新密码至少 6 位", 400);
```

**建议**：加复杂度要求
```js
const strongRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
if (!strongRegex.test(newPassword)) {
  throw new BizError("密码至少 8 位且包含字母和数字", 400);
}
```

#### V14. request.ts whiteList 用 includes 匹配

**位置**：[request.ts#L31](file:///Users/zlzk/Dev/personal/bms/mp/src/services/request.ts#L31)

```js
private whiteList = ["/auth/login", "/auth/wechat/login", "/auth/wechat/bind"];
// ...
if (!getToken() && !this.whiteList.includes(mergedConfig.url)) {
```

**问题**：`includes` 是精确匹配，OK，但如果 URL 带了 query 参数会匹配不到。建议用 `startsWith`。

#### V15. tempToken 通过 URL 参数传递

**位置**：[auth.ts#L36](file:///Users/zlzk/Dev/personal/bms/mp/src/services/auth.ts#L36)

```js
Taro.redirectTo({ url: `/pages/authPage/index?tempToken=${response.tempToken}` });
```

**问题**：tempToken 出现在 URL 里，可能被截图或日志记录。虽然 30 分钟过期，仍是风险。

**修复**：用 storage 中转
```js
// auth.ts
Taro.setStorageSync('temp_token', response.tempToken);
Taro.redirectTo({ url: '/pages/authPage/index' });

// authPage
const tempToken = Taro.getStorageSync('temp_token') || '';
```

---

## 三、逻辑问题

### L1. 退出登录后跳 authPage 但没带 tempToken

`logout()` 直接 `reLaunch('/pages/authPage/index')`，但 authPage 需要 tempToken 才能绑定。用户会被卡在 authPage，需要点"重新获取微信凭证"才能拿 tempToken。应该 logout 后直接调 `handleWechatLogin()` 自动走微信登录流程。

### L2. app.tsx getLocalUserInfo 失败默认按 ROLE_SALES

[api.ts#L37-L45](file:///Users/zlzk/Dev/personal/bms/mp/src/services/api.ts#L37-L45) 中 `emptyInfo.role = "ROLE_SALES"`。如果 storage 损坏但 token 还在，会跳到 sales dashboard，实际用户可能是 admin。

### L3. handleWechatLogin 用模块级 isLoggingIn 防抖

[auth.ts#L5](file:///Users/zlzk/Dev/personal/bms/mp/src/services/auth.ts#L5) `let isLoggingIn = false`。如果 `Taro.login` 失败但 `complete` 回调没触发（极小概率），`isLoggingIn` 会一直为 true，导致后续登录都失效。建议加超时重置。

### L4. request.ts 401 自动调 handleWechatLogin 可能死循环

如果 `handleWechatLogin` 内部请求失败，会走 `.catch`，但 catch 里没调 `clearToken`，下次请求又会触发 401 → handleWechatLogin。虽然 `isLoggingIn` 防抖，但用户体验差。建议在 catch 里加 `clearToken()`。

---

## 四、优化建议（非安全）

### O1. 加 /api/auth/me 接口

启动时拉最新用户信息，避免本地 userInfo 过期（用户角色被改、项目权限被收回等情况）。

```js
// authController.js
exports.me = async (req, res) => {
  return { data: serializeUser(req.user) };
};

// routes/auth.js
router.get("/me", auth, wrap(authCtrl.me));
```

### O2. 加 refresh token 机制

access token 7 天过期太长，建议改 2 小时，配 refresh token 7 天，access 过期时用 refresh 换新 access。降低 token 泄露风险。

### O3. 用启动路由守卫页代替 pages[0] = sales/dashboard

详见 V6。避免非 sales 角色启动时触发 403 请求。

### O4. JWT 用 RS256 非对称签名

HS256 对称签名，secret 泄露后可伪造。RS256 用私钥签名、公钥验签，私钥不离开服务器，更安全。

### O5. 前端 eventBus 应该用 Taro.eventCenter

[app.tsx#L11-L35](file:///Users/zlzk/Dev/personal/bms/mp/src/app.tsx#L11-L35) 自己实现了一个 eventBus，但 Taro 内置 `Taro.eventCenter` 已经提供同样能力。建议统一用 `Taro.eventCenter`，减少代码量，避免重复造轮子。

### O6. wechatBind 应该校验账号角色

当前流程下，任何角色账号都能通过 wechatBind 绑定微信。但业务上：
- 销售员/渠道员：通过微信小程序绑定
- 管理员：不应在小程序登录，应只通过 PC 后台密码登录

建议在 wechatBind 里拒绝 ROLE_ADMIN 角色：
```js
if (user.role === "ROLE_ADMIN") {
  throw new BizError("管理员账号不支持微信绑定", 403);
}
```

---

## 五、修复优先级

| 优先级 | 编号 | 标题 | 工作量 |
| --- | --- | --- | --- |
| P0 | V1 | JWT_SECRET 默认值兜底 | 小 |
| P0 | V2 | mock openid 固定值 | 小 |
| P0 | V3 | /auth/login 暴露用户名是否存在 | 小 |
| P1 | V4 | 登录/绑定接口无限流 | 中 |
| P1 | V5 | logout 无法真正退出 | 中 |
| P1 | V6 | 启动页 reLaunch 触发 403 | 中 |
| P1 | V7 | 有 token 时不验证有效性 | 中 |
| P2 | V8-V15 | 其他漏洞 | 小 |
| P2 | L1-L4 | 逻辑问题 | 小 |
| P3 | O1-O6 | 优化建议 | 中 |
