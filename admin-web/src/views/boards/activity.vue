<template>
  <el-card shadow="never">
    <template #header>
      <div class="header">
        <span>实时动态看板（适合投屏）</span>
        <el-space>
          <el-tag type="success">今日新增 {{ stats.created }}</el-tag>
          <el-tag type="primary">今日到访 {{ stats.arrived }}</el-tag>
          <el-tag type="warning">今日跟进 {{ stats.followed }}</el-tag>
          <el-tag type="danger">今日审批 {{ stats.approved }}</el-tag>
          <el-button size="small" :icon="Refresh" circle @click="load" />
        </el-space>
      </div>
    </template>

    <el-row :gutter="16">
      <el-col :span="16">
        <el-timeline style="max-height: 480px; overflow-y: auto">
          <el-timeline-item
            v-for="item in activities"
            :key="item.id"
            :timestamp="item.timeText"
            :type="item.type"
          >
            {{ item.content }}
          </el-timeline-item>
        </el-timeline>
        <el-empty v-if="!activities.length" description="暂无动态" />
      </el-col>
      <el-col :span="8">
        <div ref="el" class="chart"></div>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { Refresh } from "@element-plus/icons-vue";
import { useEcharts } from "@/composables/useEcharts";
import { getActivityStatsApi } from "@/api/dashboard";
import { useProjectStore } from "@/stores/project";

const projectStore = useProjectStore();
const stats = reactive({ created: 0, arrived: 0, followed: 0, approved: 0 });
const activities = ref([]);

// 今日四类动作对比
const option = computed(() => ({
  tooltip: { trigger: "item" },
  radar: {
    indicator: [
      { name: "新增", max: Math.max(stats.created * 1.5, 10) },
      { name: "到访", max: Math.max(stats.arrived * 1.5, 10) },
      { name: "跟进", max: Math.max(stats.followed * 1.5, 10) },
      { name: "审批", max: Math.max(stats.approved * 1.5, 10) },
    ],
  },
  series: [
    {
      type: "radar",
      data: [
        {
          value: [stats.created, stats.arrived, stats.followed, stats.approved],
          name: "今日",
          areaStyle: { opacity: 0.3 },
        },
      ],
    },
  ],
}));

const { el } = useEcharts(option);

let timer = null;

function formatTime(t) {
  const d = new Date(t);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function load() {
  if (!projectStore.currentProjectId) return;
  try {
    // GET /api/admin/stats/activity → { stats, activities }
    const data = await getActivityStatsApi();
    Object.assign(stats, data?.stats || {});
    activities.value = (data?.activities || []).map((a) => ({
      ...a,
      timeText: formatTime(a.time),
      type: { APPROVE: "success", CUSTOMER_CREATE: "primary", FOLLOWUP_CREATE: "warning" }[a.action] || "info",
    }));
  } catch {
    // 接口异常时保留现有数据
  }
}

onMounted(() => {
  load();
  timer = setInterval(load, 30000); // 30s 自动刷新
});

onUnmounted(() => clearInterval(timer));
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chart {
  width: 100%;
  height: 420px;
}
</style>
