<template>
  <el-row :gutter="16">
    <el-col :span="10">
      <el-card shadow="never">
        <template #header>即将满 30 天未跟进客户（按销售员聚合）</template>
        <div ref="el" class="chart"></div>
      </el-card>
    </el-col>
    <el-col :span="14">
      <el-card shadow="never">
        <template #header>预警明细（按意向等级分布）</template>
        <div ref="pieEl" class="chart"></div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useEcharts } from "@/composables/useEcharts";
import { getWarningStatsApi } from "@/api/dashboard";
import { useProjectStore } from "@/stores/project";

const projectStore = useProjectStore();
const bySalesman = ref([]);

const salesmanNames = computed(() => bySalesman.value.map((r) => r.name));
const warningCounts = computed(() => bySalesman.value.map((r) => r.warningCount));

// 红色预警柱状图
const option = computed(() => ({
  tooltip: { trigger: "axis" },
  grid: { left: 40, right: 20, bottom: 30, containLabel: true },
  xAxis: { type: "category", data: salesmanNames.value },
  yAxis: { type: "value" },
  series: [
    {
      type: "bar",
      data: warningCounts.value,
      itemStyle: { color: "#f56c6c" },
      label: { show: true, position: "top" },
    },
  ],
}));

const INTENT_LABELS = { HIGH: "高意向", MEDIUM: "中意向", LOW: "低意向", NONE: "无意向" };
const pieData = computed(() =>
  (byIntent.value || []).map((r) => ({ name: INTENT_LABELS[r.intentLevel] || r.intentLevel, value: r.warningCount }))
);

const pieOption = computed(() => ({
  tooltip: { trigger: "item" },
  legend: { bottom: 0 },
  series: [
    {
      type: "pie",
      radius: ["35%", "60%"],
      data: pieData.value,
    },
  ],
}));

const { el } = useEcharts(option);
const { el: pieEl } = useEcharts(pieOption);

const byIntent = ref([]);

async function load() {
  if (!projectStore.currentProjectId) return;
  try {
    // GET /api/admin/stats/warning → { bySalesman, byIntent, reminderDays }
    const data = await getWarningStatsApi();
    bySalesman.value = data?.bySalesman || [];
    byIntent.value = data?.byIntent || [];
  } catch {
    bySalesman.value = [];
    byIntent.value = [];
  }
}

onMounted(load);
watch(() => projectStore.currentProjectId, load);
</script>

<style scoped>
.chart {
  width: 100%;
  height: 380px;
}
</style>
