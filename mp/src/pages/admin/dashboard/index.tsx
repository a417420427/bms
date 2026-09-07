import { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { adminDashboard, getLocalProject } from "@/services/api";
import StatCard from "@/components/StatCard";
import Empty from "@/components/Empty";
import ProjectSelect from "@/components/ProjectSelect";
import "./index.scss";

interface Stats {
  total: number;
  salesCount: number;
  channelCount: number;
  publicCount: number;
  expiredCount: number;
  pendingApproval: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [project, setProject] = useState<ProjectItem | null>(getLocalProject());
  const [projectModal, setProjectModal] = useState(false);

  const load = () => {
    adminDashboard(project?._id).then((res: any) => setStats(res));
  };

  useEffect(() => {
    load();
  }, [project?._id]);

  const go = (url: string) => Taro.navigateTo({ url });

  return (
    <View className="admin-dashboard">
      <View
        className="admin-dashboard__project"
        onClick={() => setProjectModal(true)}
      >
        当前项目：<Text className="primary">{project?.name || "全部项目"}</Text>
        <Text className="admin-dashboard__switch">›</Text>
      </View>

      <View className="admin-dashboard__stats">
        <StatCard title="客户总数" value={stats?.total ?? "-"} onClick={() => go("/pages/admin/customerList/index")} />
        <StatCard title="销售员录入" value={stats?.salesCount ?? "-"} />
        <StatCard title="渠道推荐" value={stats?.channelCount ?? "-"} />
        <StatCard title="公共池" value={stats?.publicCount ?? "-"} onClick={() => go("/pages/admin/publicPool/index")} />
        <StatCard title="过期池" value={stats?.expiredCount ?? "-"} onClick={() => go("/pages/admin/expiredPool/index")} />
        <StatCard
          title="待审批申领"
          value={stats?.pendingApproval ?? "-"}
          valueColor="#ff4d4f"
          onClick={() => go("/pages/admin/unvisitedApproval/index")}
        />
      </View>

      <View className="admin-dashboard__actions">
        <View className="action-item" onClick={() => go("/pages/admin/customerList/index")}>全部客户管理</View>
        <View className="action-item" onClick={() => go("/pages/admin/publicPool/index")}>公共池客户管理</View>
        <View className="action-item" onClick={() => go("/pages/admin/unvisitedApproval/index")}>未到访申领审批</View>
        <View className="action-item" onClick={() => go("/pages/admin/expiredPool/index")}>过期客户池管理</View>
        <View className="action-item" onClick={() => go("/pages/admin/export/index")}>客户数据导出</View>
        <View className="action-item" onClick={() => go("/pages/admin/project/index")}>系统配置</View>
        <View className="action-item" onClick={() => go("/pages/admin/auditLog/index")}>操作日志</View>
      </View>
      {!stats ? <Empty text="加载中..." /> : null}

      <ProjectSelect
        visible={projectModal}
        onClose={() => setProjectModal(false)}
        onSelected={(p) => {
          setProject(p);
          setProjectModal(false);
        }}
      />
    </View>
  );
}
