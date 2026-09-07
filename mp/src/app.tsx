import { PropsWithChildren, useEffect } from "react";
import Taro, { useDidShow, useLaunch } from "@tarojs/taro";
import { UserProvider } from "@/contexts/UserContext";

import { ROLE_HOME } from "@/utils/constants";
import "./app.scss";
import { getToken, getLocalUserInfo, setLocalUserInfo } from "./services/api";
import { handleWechatLogin } from "./services/auth";

// 全局事件总线
const eventBus = {
  events: {} as Record<string, Function[]>,
  on(eventName: string, callback: Function) {
    if (!this.events[eventName]) {
      this.events[eventName] = [];
    }
    if (!this.events[eventName].includes(callback)) {
      this.events[eventName].push(callback);
    }
  },
  off(eventName: string, callback?: Function) {
    if (!this.events[eventName]) return;
    if (callback) {
      this.events[eventName] = this.events[eventName].filter(fn => fn !== callback);
    } else {
      this.events[eventName] = [];
    }
  },
  emit(eventName: string, ...args: any[]) {
    if (!this.events[eventName]) return;
    this.events[eventName].forEach((callback: Function) => {
      callback(...args);
    });
  }
};

(Taro as any).eventBus = eventBus;

function App({ children }: PropsWithChildren<any>) {
  const initAppData = async () => {
    Taro.setInnerAudioOption({ obeyMuteSwitch: false });
    const token = getToken();
    if (!token) {
      // 未登录：走微信登录流程
      handleWechatLogin();
      return;
    }
    // 已登录：直接进对应角色首页，不再跳转登录页
    const userInfo = getLocalUserInfo();
    (Taro as any).eventBus.emit('userInfoUpdate', userInfo);
    setLocalUserInfo(userInfo);
    const currentPages = Taro.getCurrentPages();
    const currentPath = currentPages[0]?.path;
    const home = ROLE_HOME[userInfo.role] || ROLE_HOME.ROLE_SALES;
    if (currentPath !== home) {
      Taro.reLaunch({ url: home });
    }
  };

  useLaunch(async () => {
    await initAppData();
  });

  useEffect(() => {
    const handleRefreshApp = async () => {
      await initAppData();
    };
    eventBus.on("refreshAppData", handleRefreshApp);
    return () => {
      eventBus.off("refreshAppData", handleRefreshApp);
    };
  }, []);

  useDidShow(() => {
    // 路由埋点占位
  });

  return <UserProvider>{children}</UserProvider>;
}

declare module '@tarojs/taro' {
  interface TaroStatic {
    eventBus: typeof eventBus;
  }
}

export default App;
