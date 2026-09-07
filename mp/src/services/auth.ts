import Taro from "@tarojs/taro";
import { ROLE_HOME } from "@/utils/constants";
import { wechatLogin, setToken, getLocalUserInfo, setLocalUserInfo } from "./api";

let isLoggingIn = false;

/**
 * 微信小程序登录：用 wx.login() 的 code 换取后端 token
 */
export function handleWechatLogin() {
  if (isLoggingIn) return;
  isLoggingIn = true;
  Taro.showLoading({ title: "登录中...", mask: true });

  Taro.login({
    success: (res) => {
      if (!res.code) {
        Taro.hideLoading();
        Taro.showToast({ title: "获取登录凭证失败", icon: "none" });
        return;
      }
      wechatLogin(res.code)
        .then((response: any) => {
          Taro.hideLoading();
          console.log('登录成功', response);
          if (response.bound && response.token) {
            // 已绑定账号：跳转到对应角色首页
            setToken(response.token);
            setLocalUserInfo(response.user);
            (Taro as any).eventBus?.emit?.("userInfoUpdate", response.user);
            const home = ROLE_HOME[response.user.role] || ROLE_HOME.ROLE_SALES;
            Taro.reLaunch({ url: home });
          } else if (!response.bound && response.tempToken) {
            // 未绑定账号，跳转到账号绑定页
            Taro.redirectTo({
              url: `/pages/authPage/index?tempToken=${response.tempToken}`,
            });
          }
        })
        .catch(() => {
          Taro.hideLoading();
          Taro.showToast({ title: "登录失败", icon: "none" });
        });
    },
    fail: () => {
      Taro.hideLoading();
      Taro.showToast({ title: "登录失败", icon: "none" });
    },
    complete: () => {
      isLoggingIn = false;
    },
  });
}

/** 账号密码登录（备用，用于后台绑定流程） */
export function passwordLogin(username: string, password: string, redirectUrl = "/pages/sales/dashboard/index") {
  return import("./api").then(({ login }) => {
    return login(username, password).then((res: any) => {
      setToken(res.token);
      setLocalUserInfo(res.user);
      (Taro as any).eventBus?.emit?.("userInfoUpdate", res.user);
      Taro.reLaunch({ url: redirectUrl });
      return res;
    });
  });
}

/** 退出登录 */
export function logout() {
  const { clearToken } = require("./api");
  clearToken();
  (Taro as any).eventBus?.emit?.("userInfoUpdate", getLocalUserInfo());
  Taro.reLaunch({ url: "/pages/authPage/index" });
}
