// 自定义导航头部（占位）
import { FC, ReactNode } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import "./index.scss";

interface Props {
  title?: string;
  back?: boolean;
  right?: ReactNode;
  onBack?: () => void;
}

const CustomHeader: FC<Props> = ({ title, back = true, right, onBack }) => {
  const handleBack = () => {
    if (onBack) return onBack();
    Taro.navigateBack({ delta: 1 }).catch(() => {
      Taro.switchTab({ url: "/pages/sales/dashboard/index" });
    });
  };
  return (
    <View className="custom-header">
      {back ? <Text className="custom-header__back" onClick={handleBack}>‹</Text> : null}
      <Text className="custom-header__title">{title}</Text>
      <View className="custom-header__right">{right}</View>
    </View>
  );
};

export default CustomHeader;
