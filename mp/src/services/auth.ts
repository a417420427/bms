import Taro from "@tarojs/taro";
import { ROLE_HOME } from "@/utils/constants";
import {
  wechatLogin,
  wechatUnbind,
  setToken,
  clearToken,
  clearLocalUserInfo,
  setLocalUserInfo,
} from "./api";

// V15: tempToken 通过 storage 中转，避免出现在 URL 里
const TEMP_TOKEN_KEY = "bms_temp_token";
const TEMP_TOKEN_EXPIRE = 5 * 60 * 1000; // 5 分钟内有效

// L3: isLoggingIn 加超时自动重置（5 秒），避免异常时永久卡住
let isLoggingIn = false;
let loggingInTimer: any = null;
const lockLogin = () => {
  isLoggingIn = true;
  if (loggingInTimer) clearTimeout(loggingInTimer);
  loggingInTimer = setTimeout(() => {
    isLoggingIn = false;
    loggingInTimer = null;
  }, 5000);
};
const unlockLogin = () => {
  isLoggingIn = false;
  if (loggingInTimer) {
    clearTimeout(loggingInTimer);
    loggingInTimer = null;
  }
};

// V15: 设置/读取 tempToken（带 5 分钟过期）
const setTempToken = (token: string) => {
  Taro.setStorageSync(TEMP_TOKEN_KEY, JSON.stringify({ token, ts: Date.now() }));
};
const getTempToken = (): string => {
  try {
    const data = JSON.parse(Taro.getStorageSync(TEMP_TOKEN_KEY) || "null");
    if (!data) return "";
    if (Date.now() - data.ts > TEMP_TOKEN_EXPIRE) {
      Taro.removeStorageSync(TEMP_TOKEN_KEY);
      return "";
    }
    return data.token;
  } catch {
    return "";
  }
};
const clearTempToken = () => {
  try { Taro.removeStorageSync(TEMP_TOKEN_KEY); } catch {}
};

/**
 * 微信小程序登录：用 wx.login() 的 code 换取后端 token
 */
export function handleWechatLogin() {
  if (isLoggingIn) return;
  lockLogin();
  Taro.showLoading({ title: "登录中...", mask: true });

  Taro.login({
    success: (res) => {
      if (!res.code) {
        Taro.hideLoading();
        unlockLogin();
        Taro.showToast({ title: "获取登录凭证失败", icon: "none" });
        return;
      }
      wechatLogin(res.code)
        .then((response: any) => {
          Taro.hideLoading();
          unlockLogin();
          console.log('[auth] wechatLogin response:', response);
          if (response.bound && response.token) {
            // 已绑定账号：跳转到对应角色首页
            setToken(response.token);
            setLocalUserInfo(response.user);
            Taro.eventCenter.trigger("userInfoUpdate", response.user);
            const home = ROLE_HOME[response.user.role] || ROLE_HOME.ROLE_SALES;
            Taro.reLaunch({ url: home });
          } else if (!response.bound && response.tempToken) {
            // 未绑定账号：tempToken 走 storage 中转，再跳转绑定页
            setTempToken(response.tempToken);
            Taro.redirectTo({ url: "/pages/authPage/index" });
          }
        })
        .catch((err) => {
          Taro.hideLoading();
          unlockLogin();
          // L4: catch 里 clearToken，避免 401 死循环
          clearToken();
          console.error('[auth] wechatLogin failed:', err);
          Taro.showToast({ title: (err && err.message) || "登录失败", icon: "none" });
        });
    },
    fail: () => {
      Taro.hideLoading();
      unlockLogin();
      Taro.showToast({ title: "登录失败", icon: "none" });
    },
  });
}

/** 账号密码登录（备用，PC 后台用） */
export function passwordLogin(username: string, password: string, redirectUrl = "/pages/sales/dashboard/index") {
  return import("./api").then(({ login }) => {
    return login(username, password).then((res: any) => {
      setToken(res.token);
      setLocalUserInfo(res.user);
      Taro.eventCenter.trigger("userInfoUpdate", res.user);
      Taro.reLaunch({ url: redirectUrl });
      return res;
    });
  });
}

/**
 * 退出登录
 * V5: 真正退出 — 调后端解绑 openid + 清本地 token + 清本地用户信息
 * L1: 退出后走 handleWechatLogin，避免用户卡在 authPage
 *
 * 关键：只有 wechatUnbind 成功后才走 handleWechatLogin（此时 openid 已清，
 *   后端会返回 bound=false → 跳绑定页）。
 *   如果 unbind 失败（token 过期/网络错误），openid 仍在后端绑着，
 *   此时若调 handleWechatLogin 会直接 bound=true 自动登录回原账号，
 *   等于退出无效。失败时改跳 authPage，让用户手动重新走绑定流程。
 */
export async function logout() {
  // 防止重复点击
  if (isLoggingIn) return;
  lockLogin();
  Taro.showLoading({ title: "退出中...", mask: true });

  let unbindOk = false;
  try {
    await wechatUnbind();
    unbindOk = true;
  } catch (e: any) {
    console.warn("[auth] wechatUnbind failed:", e);
  }

  // 无论如何都清本地登录态
  clearToken();
  clearLocalUserInfo();
  clearTempToken();
  Taro.eventCenter.trigger("userInfoUpdate", null);

  Taro.hideLoading();
  unlockLogin();

  // 最彻底的方案：清空所有 storage（包括项目选择、用户信息等），
  // 然后 reLaunch 到 launch 页，launch 会重新走 init 流程
  try {
    Taro.clearStorageSync();
  } catch (e) {
    console.warn("[auth] clearStorage failed:", e);
  }

  // reLaunch 销毁所有页面组件重新挂载，launch 页会触发 init
  Taro.reLaunch({
    url: "/pages/launch/index",
    complete: () => {
      // 兜底：如果 reLaunch 后 launch 页没自动走 init，强制重启
      console.log("[auth] logout reLaunch complete");
    },
  });
}

export { setTempToken, getTempToken, clearTempToken };
