import { useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { getToken, clearToken, getMe, setLocalUserInfo } from "@/services/api";
import { handleWechatLogin } from "@/services/auth";
import { ROLE_HOME } from "@/utils/constants";
import "./index.scss";

/**
 * 启动路由守卫页（pages[0]）
 * V6: 避免非 sales 角色启动时误触发 sales/dashboard 请求导致 403
 * V7: 有 token 时调用 /auth/me 验证有效性，过期则清掉走重新登录
 * O3: 作为独立启动入口，避免业务页被作为启动页
 */
export default function Launch() {
  useEffect(() => {
    const init = async () => {
      const token = getToken();
      if (!token) {
        handleWechatLogin();
        return;
      }
      try {
        // V7: 调 /auth/me 验证 token，顺便拿最新用户信息
        const user = await getMe();
        setLocalUserInfo(user);
        Taro.eventCenter.trigger("userInfoUpdate", user);
        const home = ROLE_HOME[user.role] || ROLE_HOME.ROLE_SALES;
        Taro.reLaunch({ url: home });
      } catch (e: any) {
        // token 过期或无效：清掉走重新登录
        console.warn("[launch] token invalid:", e);
        clearToken();
        handleWechatLogin();
      }
    };
    init();
  }, []);

  return (
    <View className="launch">
      <Text className="launch__text">加载中...</Text>
    </View>
  );
}
