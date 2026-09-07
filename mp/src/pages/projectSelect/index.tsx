import Taro, { useDidShow } from "@tarojs/taro";
import { View } from "@tarojs/components";
import { useState } from "react";
import ProjectSelect from "@/components/ProjectSelect";
import { ROLE_HOME } from "@/utils/constants";
import { getLocalUserInfo } from "@/services/api";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

export default function ProjectSelectPage() {
  useShare({ title: "商管营销宝 - 选择项目" });
  const [visible, setVisible] = useState(true);

  useDidShow(() => {
    setVisible(true);
  });

  const handleSelected = () => {
    setVisible(false);
    const user = getLocalUserInfo();
    const home = ROLE_HOME[user.role] || ROLE_HOME.ROLE_SALES;
    Taro.reLaunch({ url: home });
  };

  return (
    <View className="project-select-page">
      <View className="project-select-page__tip">请选择您要操作的项目</View>
      <ProjectSelect
        visible={visible}
        onSelected={handleSelected}
        onClose={() => setVisible(false)}
      />
    </View>
  );
}
