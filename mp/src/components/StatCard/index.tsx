import { FC, ReactNode } from "react";
import { View, Text } from "@tarojs/components";
import "./index.scss";

interface Props {
  title?: string;
  value?: number | string;
  valueColor?: string;
  onClick?: () => void;
  children?: ReactNode;
}

const StatCard: FC<Props> = ({ title, value, valueColor, onClick, children }) => {
  return (
    <View className={`stat-card${onClick ? " clickable" : ""}`} onClick={onClick}>
      {children || (
        <>
          <Text className="stat-card__value" style={valueColor ? { color: valueColor } : {}}>
            {value != null ? value : "-"}
          </Text>
          <Text className="stat-card__title">{title}</Text>
        </>
      )}
    </View>
  );
};

export default StatCard;
