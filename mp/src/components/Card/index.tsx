import { FC, ReactNode } from "react";
import { View, Text } from "@tarojs/components";
import "./index.scss";

interface Props {
  title: string;
  extra?: ReactNode;
  onClick?: () => void;
  children?: ReactNode;
}

const Card: FC<Props> = ({ title, extra, onClick, children }) => {
  return (
    <View className="card-block">
      <View className="card-block__header">
        <Text className="card-block__title">{title}</Text>
        {extra ? <View className="card-block__extra">{extra}</View> : null}
      </View>
      <View className="card-block__body" onClick={onClick}>
        {children}
      </View>
    </View>
  );
};

export default Card;
