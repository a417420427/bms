<template>
  <el-card shadow="never">
    <template #header>
      <div class="header">
        <span>客户漏斗看板（报备 → 到访 → 跟进 → 成交）</span>
        <el-date-picker
          v-model="range"
          type="daterange"
          value-format="YYYY-MM-DD"
          size="small"
          start-placeholder="开始"
          end-placeholder="结束"
          @change="load"
        />
      </div>
    </template>
    <div ref="el" class="chart"></div>
  </el-card>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useEcharts } from "@/composables/useEcharts";
import { getFunnelStatsApi } from "@/api/dashboard";
import { useProjectStore } from "@/stores/project";

const projectStore = useProjectStore();
const range = ref(null);

// 漏斗数据：报备 → 到访 → 跟进 → 成交
const funnelData = ref([
  { name: "报备客户", value: 0 },
  { name: "到访客户", value: 0 },
  { name: "有效跟进", value: 0 },
  { name: "成交客户", value: 0 },
]);

const option = computed(() => ({
  tooltip: { trigger: "item", formatter: "{b}: {c}" },
  series: [
    {
      type: "funnel",
      left: "10%",
      width: "80%",
      label: { show: true, formatter: "{b}: {c}" },
      data: funnelData.value,
    },
  ],
}));

const { el } = useEcharts(option);

async function load() {
  if (!projectStore.currentProjectId) return;
  try {
    // GET /api/admin/stats/funnel?startTime=&endTime=
    const data = await getFunnelStatsApi({
      startTime: range.value?.[0],
      endTime: range.value?.[1],
    });
    if (data?.funnel) funnelData.value = data.funnel;
  } catch {
    // 接口异常时保留占位
  }
}

onMounted(load);
watch(() => [projectStore.currentProjectId, range.value], load);
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
