import { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { adminDashboard, getLocalProject, getLocalUserInfo } from "@/services/api";
import StatCard from "@/components/StatCard";
import Empty from "@/components/Empty";
import ProjectSelect from "@/components/ProjectSelect";
import { go } from "@/utils/common";
import { useShare } from "@/hooks/useShare";
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
  useShare({ title: "商管营销宝 - 管理总览" });
  const [stats, setStats] = useState<Stats | undefined>(undefined);
  const [project, setProject] = useState<ProjectItem>(getLocalProject());
  const [projectModal, setProjectModal] = useState(false);
  // 0907: 系统管理员（唯一账号）才能新增项目/角色/公司
  const userInfo = getLocalUserInfo();
  const isSystemAdmin = !!userInfo.isSystemAdmin;

  const load = () => {
    adminDashboard(project && project._id).then((res: any) => setStats(res));
  };

  useEffect(() => {
    load();
  }, [project && project._id]);

  return (
    <View className="admin-dashboard">
      <View
        className="admin-dashboard__project"
        onClick={() => setProjectModal(true)}
      >
        当前项目：<Text className="primary">{(project && project.name) || "全部项目"}</Text>
        <Text className="admin-dashboard__switch">›</Text>
      </View>

      <View className="admin-dashboard__stats">
        <StatCard title="客户总数" value={((stats && stats.total) != null ? (stats && stats.total) : "-")} onClick={() => go("/pages/admin/customerList/index")} />
        <StatCard title="销售员录入" value={((stats && stats.salesCount) != null ? (stats && stats.salesCount) : "-")} />
        <StatCard title="渠道推荐" value={((stats && stats.channelCount) != null ? (stats && stats.channelCount) : "-")} />
        <StatCard title="公共池" value={((stats && stats.publicCount) != null ? (stats && stats.publicCount) : "-")} onClick={() => go("/pages/admin/publicPool/index")} />
        <StatCard title="过期池" value={((stats && stats.expiredCount) != null ? (stats && stats.expiredCount) : "-")} onClick={() => go("/pages/admin/expiredPool/index")} />
        <StatCard
          title="待审批申领"
          value={((stats && stats.pendingApproval) != null ? (stats && stats.pendingApproval) : "-")}
          valueColor="#ff4d4f"
          onClick={() => go("/pages/admin/unvisitedApproval/index")}
        />
      </View>

      <View className="admin-dashboard__actions">
        <View className="action-item" onClick={() => go("/pages/admin/customerCreate/index")}>新增客户录入</View>
        <View className="action-item" onClick={() => go("/pages/admin/customerList/index")}>全部客户管理</View>
        <View className="action-item" onClick={() => go("/pages/admin/publicPool/index")}>公共池客户管理</View>
        <View className="action-item" onClick={() => go("/pages/admin/unvisitedApproval/index")}>未到访申领审批</View>
        <View className="action-item" onClick={() => go("/pages/admin/expiredPool/index")}>过期客户池管理</View>
        <View className="action-item" onClick={() => go("/pages/admin/export/index")}>客户数据导出</View>
        {/* 0907: 用户/合作公司/项目配置仅系统管理员（唯一账号）可操作 */}
        {isSystemAdmin ? (
          <View className="action-item" onClick={() => go("/pages/admin/user/index")}>用户管理</View>
        ) : null}
        {isSystemAdmin ? (
          <View className="action-item" onClick={() => go("/pages/admin/company/index")}>合作公司管理</View>
        ) : null}
        {isSystemAdmin ? (
          <View className="action-item" onClick={() => go("/pages/admin/project/index")}>项目配置</View>
        ) : null}
        <View className="action-item" onClick={() => go("/pages/admin/config/index")}>系统参数</View>
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
