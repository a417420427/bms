import { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { channelDashboard, getLocalProject } from "@/services/api";
import StatCard from "@/components/StatCard";
import Empty from "@/components/Empty";
import { go } from "@/utils/common";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

interface Stats {
  total: number;
  visited: number;
  unvisited: number;
  expiredCount: number;
}

export default function ChannelDashboard() {
  useShare({ title: "商管营销宝 - 渠道工作台" });
  const [stats, setStats] = useState<Stats | null>(null);
  const [project, setProject] = useState<ProjectItem | null>(getLocalProject());

  useEffect(() => {
    if (!project) {
      Taro.redirectTo({ url: "/pages/projectSelect/index" });
      return;
    }
    channelDashboard().then((res: any) => setStats(res));
  }, []);

  return (
    <View className="channel-dashboard">
      <View className="channel-dashboard__project">
        当前项目：<Text className="primary">{(project && project.name) || "未选择"}</Text>
      </View>
      <View className="channel-dashboard__stats">
        <StatCard title="推荐客户" value={((stats && stats.total) != null ? (stats && stats.total) : "-")} onClick={() => go("/pages/channel/customerList/index")} />
        <StatCard title="已到访" value={((stats && stats.visited) != null ? (stats && stats.visited) : "-")} />
        <StatCard title="未到访" value={((stats && stats.unvisited) != null ? (stats && stats.unvisited) : "-")} />
        <StatCard title="过期池" value={((stats && stats.expiredCount) != null ? (stats && stats.expiredCount) : "-")} onClick={() => go("/pages/channel/expiredPool/index")} />
      </View>
      <View className="channel-dashboard__actions">
        <View className="action-item" onClick={() => go("/pages/channel/customerCreate/index")}>新增推荐客户</View>
        <View className="action-item" onClick={() => go("/pages/channel/customerList/index")}>我的推荐客户</View>
        <View className="action-item" onClick={() => go("/pages/channel/expiredPool/index")}>过期客户池</View>
        <View className="action-item" onClick={() => go("/pages/mine/index")}>个人中心</View>
      </View>
      {!stats ? <Empty text="加载中..." /> : null}
    </View>
  );
}
