import { FC, ReactNode } from "react";
import { View, Text } from "@tarojs/components";
import "./index.scss";

interface TagProps {
  type?: "default" | "primary" | "success" | "warning" | "danger";
  children: ReactNode;
}

const Tag: FC<TagProps> = ({ type = "default", children }) => {
  return <Text className={`tag tag--${type}`}>{children}</Text>;
};

export default Tag;
