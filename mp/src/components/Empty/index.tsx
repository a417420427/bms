import { FC } from "react";
import { View } from "@tarojs/components";
import "./index.scss";

interface Props {
  text?: string;
}

const Empty: FC<Props> = ({ text = "暂无数据" }) => {
  return (
    <View className="empty">
      <View className="empty__icon" />
      <View className="empty__text">{text}</View>
    </View>
  );
};

export default Empty;
