import { useState, useEffect } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { CoverView, CoverImage } from "@tarojs/components";
import { getLocalUserInfo } from "@/services/api";
import { getBarList } from "./tabBarSvc";

export default function TabBar() {
  const [selected, setSelected] = useState(0);
  const [list, setList] = useState(getBarList("ROLE_SALES"));
  const route = useRouter();

  const color = "#999999";
  const selectedColor = "#1677ff";

  const refreshList = (userInfo: UserInfoProp) => {
    const ls = getBarList(userInfo.role);
    setList(ls);
    const idx = ls.findIndex((l) => l.pagePath === route.path);
    setSelected(idx >= 0 ? idx : 0);
  };

  useEffect(() => {
    refreshList(getLocalUserInfo());
    const handler = (userInfo: UserInfoProp) => refreshList(userInfo);
    Taro.eventCenter.on("userInfoUpdate", handler);
    return () => {
      Taro.eventCenter.off("userInfoUpdate", handler);
    };
  }, []);

  const switchTab = (_idx: number, url: string) => {
    Taro.switchTab({ url });
  };

  return (
    <CoverView
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "white",
        display: "flex",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {list.map((item, idx) => (
        <CoverView
          key={idx}
          style={{
            flex: 1,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            paddingTop: "10rpx",
            paddingBottom: "10rpx",
          }}
          onClick={() => switchTab(idx, item.pagePath)}
        >
          <CoverImage
            style={{ width: "44rpx", height: "44rpx" }}
            src={selected === idx ? item.selectedIconPath : item.iconPath}
          />
          <CoverView
            style={{
              marginTop: "6rpx",
              fontSize: "22rpx",
              color: selected === idx ? selectedColor : color,
            }}
          >
            {item.text}
          </CoverView>
        </CoverView>
      ))}
    </CoverView>
  );
}
