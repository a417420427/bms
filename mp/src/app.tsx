import { PropsWithChildren, useEffect } from "react";
import Taro, { useDidShow, useLaunch } from "@tarojs/taro";
import { UserProvider } from "@/contexts/UserContext";

import "./app.scss";

// O5: 统一使用 Taro.eventCenter，移除自定义 eventBus
// 启动时的 token 验证 + 角色路由分发由 launch 守卫页负责（V6/V7/O3）

function App({ children }: PropsWithChildren<any>) {
  useLaunch(async () => {
    Taro.setInnerAudioOption({ obeyMuteSwitch: false });
    // V6/O3: pages[0] 为 launch 守卫页，由它负责 token 验证与角色路由分发
    // app.tsx 不再重复 initAppData，避免与 launch 页逻辑冲突导致重复跳转/403
  });

  useEffect(() => {
    // O5: refreshAppData 也走 Taro.eventCenter，不再用自定义 eventBus
    const handleRefreshApp = async () => {
      // 启动后刷新数据交给各页面在 useDidShow 自行处理
    };
    Taro.eventCenter.on("refreshAppData", handleRefreshApp);
    return () => {
      Taro.eventCenter.off("refreshAppData", handleRefreshApp);
    };
  }, []);

  useDidShow(() => {
    // 路由埋点占位
  });

  return <UserProvider>{children}</UserProvider>;
}

export default App;
