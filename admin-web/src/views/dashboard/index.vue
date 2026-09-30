<template>
  <div>
    <!-- 统计总览 -->
    <el-row :gutter="16">
      <el-col v-for="card in cards" :key="card.label" :span="4">
        <StatCard :model-value="card.value" :label="card.label" :danger="card.danger" />
      </el-col>
    </el-row>

    <!-- 快捷入口 -->
    <el-card shadow="never" style="margin-top: 16px">
      <template #header>快捷入口</template>
      <el-space wrap :size="12">
        <el-button type="primary" @click="$router.push('/customer/create')">新增客户录入</el-button>
        <el-button @click="$router.push('/customers')">全部客户管理</el-button>
        <el-button @click="$router.push('/public-pool')">公共池客户管理</el-button>
        <el-button @click="$router.push('/unvisited-approvals')">未到访申领审批</el-button>
        <el-button @click="$router.push('/expired-pool')">过期客户池管理</el-button>
        <el-button @click="$router.push('/export')">客户数据导出</el-button>
        <template v-if="userStore.isSystemAdmin">
          <el-button type="warning" plain @click="$router.push('/settings/users')">用户管理</el-button>
          <el-button type="warning" plain @click="$router.push('/settings/companies')">合作公司管理</el-button>
          <el-button type="warning" plain @click="$router.push('/settings/projects')">项目配置</el-button>
        </template>
        <el-button @click="$router.push('/settings/config')">系统参数</el-button>
        <el-button @click="$router.push('/audit-logs')">操作日志</el-button>
      </el-space>
    </el-card>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import StatCard from "@/components/StatCard.vue";
import { getDashboardApi } from "@/api/dashboard";
import { useUserStore } from "@/stores/user";
import { useProjectStore } from "@/stores/project";

const userStore = useUserStore();
const projectStore = useProjectStore();

const stats = ref({
  total: null,
  salesEntered: null,
  channelRec: null,
  publicPoolCount: null,
  expiredPoolCount: null,
  pendingApprovals: null,
});

const cards = computed(() => [
  { label: "全部客户总数", value: stats.value.total },
  { label: "销售员录入客户", value: stats.value.salesEntered },
  { label: "渠道推荐客户", value: stats.value.channelRec },
  { label: "公共池客户", value: stats.value.publicPoolCount },
  { label: "过期池客户", value: stats.value.expiredPoolCount },
  { label: "待审批申领", value: stats.value.pendingApprovals, danger: true },
]);

async function load() {
  if (!projectStore.currentProjectId) return;
  try {
    // GET /api/admin/dashboard → { total, salesEntered, channelRec, publicPoolCount, expiredPoolCount, pendingApprovals }
    const data = await getDashboardApi({ projectId: projectStore.currentProjectId });
    Object.assign(stats.value, data);
  } catch {
    // 接口未就绪时保持占位
  }
}

onMounted(load);
watch(() => projectStore.currentProjectId, load);
</script>
