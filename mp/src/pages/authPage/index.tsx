import { useState } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { View, Text, Input, Button } from "@tarojs/components";
import { wechatBind, setToken, setLocalUserInfo } from "@/services/api";
import { handleWechatLogin, getTempToken, clearTempToken } from "@/services/auth";
import { ROLE_HOME } from "@/utils/constants";
import "./index.scss";

export default function AuthPage() {
  const router = useRouter();
  // V15: tempToken 优先从 storage 读取，兼容 URL 参数
  const tempToken =
    getTempToken() ||
    (router.params.tempToken || "") as string;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBind = async () => {
    if (!username || !password) {
      Taro.showToast({ title: "请填写账号和密码", icon: "none" });
      return;
    }
    if (!tempToken) {
      Taro.showToast({ title: "凭证缺失，请重试", icon: "none" });
      handleWechatLogin();
      return;
    }
    setLoading(true);
    try {
      const res: any = await wechatBind(tempToken, username, password);
      // 保存登录态，避免首页请求被拦截器重定向回登录页
      setToken(res.token);
      setLocalUserInfo(res.user);
      // O5: 统一用 Taro.eventCenter
      Taro.eventCenter.trigger("userInfoUpdate", res.user);
      // V15: 绑定成功后清掉 tempToken，避免残留
      clearTempToken();
      Taro.showToast({ title: "绑定成功", icon: "success" });
      // 跳转到对应角色首页
      const home = ROLE_HOME[res.user.role] || ROLE_HOME.ROLE_SALES;
      setTimeout(() => {
        Taro.reLaunch({ url: home });
      }, 800);
    } catch (e) {
      // 错误提示由 request 拦截器统一处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="auth">
      <View className="auth__title">绑定账号</View>
      <View className="auth__desc">请绑定您的商管营销宝账号</View>
      <View className="auth__form">
        <Input
          className="auth__input"
          placeholder="请输入账号"
          value={username}
          onInput={(e) => setUsername(e.detail.value)}
        />
        <Input
          className="auth__input"
          password
          placeholder="请输入密码"
          value={password}
          onInput={(e) => setPassword(e.detail.value)}
        />
        <Button
          className="auth__btn"
          loading={loading}
          disabled={loading}
          onClick={handleBind}
        >
          确认绑定
        </Button>
        <View
          className="auth__retry"
          onClick={() => handleWechatLogin()}
        >
          重新获取微信凭证
        </View>
      </View>
    </View>
  );
}
