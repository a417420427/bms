import { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { salesDashboard, getLocalProject } from "@/services/api";
import StatCard from "@/components/StatCard";
import Empty from "@/components/Empty";
import { go } from "@/utils/common";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

interface Stats {
  total: number;
  pendingFollowup: number;
  warning30Days: number;
  deal: number;
  unvisitedCount: number;
}

export default function SalesDashboard() {
  useShare({ title: "商管营销宝 - 销售工作台" });
  const [stats, setStats] = useState<Stats | null>(null);
  const [project, setProject] = useState<ProjectItem | null>(getLocalProject());

  useEffect(() => {
    if (!project) {
      Taro.redirectTo({ url: "/pages/projectSelect/index" });
      return;
    }
    salesDashboard().then((res: any) => setStats(res));
  }, []);

  return (
    <View className="sales-dashboard">
      <View className="sales-dashboard__project">
        当前项目：<Text className="primary">{(project && project.name) || "未选择"}</Text>
        <Text
          className="sales-dashboard__switch"
          onClick={() => Taro.redirectTo({ url: "/pages/projectSelect/index" })}
        >
          切换
        </Text>
      </View>

      <View className="sales-dashboard__stats">
        <StatCard title="我的客户" value={((stats && stats.total) != null ? (stats && stats.total) : "-")} onClick={() => go("/pages/sales/customerList/index")} />
        <StatCard title="待跟进" value={((stats && stats.pendingFollowup) != null ? (stats && stats.pendingFollowup) : "-")} onClick={() => go("/pages/sales/customerList/index")} />
        <StatCard
          title="30天未跟进"
          value={((stats && stats.warning30Days) != null ? (stats && stats.warning30Days) : "-")}
          valueColor="#ff4d4f"
          onClick={() => go("/pages/sales/reminder/index")}
        />
        <StatCard title="已成交" value={((stats && stats.deal) != null ? (stats && stats.deal) : "-")} />
        <StatCard title="未到访申领池" value={((stats && stats.unvisitedCount) != null ? (stats && stats.unvisitedCount) : "-")} onClick={() => go("/pages/sales/unvisitedPool/index")} />
      </View>

      <View className="sales-dashboard__actions">
        <View className="action-item" onClick={() => go("/pages/sales/customerCreate/index")}>新增客户录入</View>
        <View className="action-item" onClick={() => go("/pages/sales/customerList/index")}>我的客户列表</View>
        <View className="action-item" onClick={() => go("/pages/sales/publicPool/index")}>公共池客户</View>
        <View className="action-item" onClick={() => go("/pages/sales/unvisitedPool/index")}>未到访申领池</View>
        <View className="action-item" onClick={() => go("/pages/sales/reminder/index")}>跟进提醒</View>
      </View>
      {!stats ? <Empty text="加载中..." /> : null}
    </View>
  );
}
