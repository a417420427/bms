<template>
  <el-row :gutter="16">
    <el-col :span="14">
      <el-card shadow="never">
        <template #header>合作公司推荐量 / 到访率 / 过期率趋势</template>
        <div ref="el" class="chart"></div>
      </el-card>
    </el-col>
    <el-col :span="10">
      <el-card shadow="never">
        <template #header>渠道员推荐 Top 榜</template>
        <el-table :data="topList" border stripe>
          <el-table-column type="index" label="排名" width="70" />
          <el-table-column prop="name" label="渠道员" min-width="90" />
          <el-table-column prop="recommendCount" label="推荐量" width="90" />
          <el-table-column prop="visitRate" label="到访率" width="90" />
        </el-table>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useEcharts } from "@/composables/useEcharts";
import { getChannelStatsApi } from "@/api/dashboard";
import { useProjectStore } from "@/stores/project";

const projectStore = useProjectStore();
const topList = ref([]);
const companies = ref([]);

const option = computed(() => ({
  tooltip: { trigger: "axis" },
  legend: { data: ["推荐量", "到访率", "过期率"] },
  grid: { left: 40, right: 40, bottom: 60, containLabel: true },
  xAxis: {
    type: "category",
    data: companies.value.map((c) => c.name),
    axisLabel: { rotate: 30 },
  },
  yAxis: [
    { type: "value", name: "推荐量" },
    { type: "value", name: "比率", axisLabel: { formatter: "{value}%" }, max: 100 },
  ],
  series: [
    { name: "推荐量", type: "bar", data: companies.value.map((c) => c.recommendCount) },
    { name: "到访率", type: "line", yAxisIndex: 1, data: companies.value.map((c) => c.visitRate) },
    { name: "过期率", type: "line", yAxisIndex: 1, data: companies.value.map((c) => c.expireRate) },
  ],
}));

const { el } = useEcharts(option);

async function load() {
  if (!projectStore.currentProjectId) return;
  try {
    // GET /api/admin/stats/channel → { companies, topUsers }
    const data = await getChannelStatsApi();
    companies.value = data?.companies || [];
    topList.value = data?.topUsers || [];
  } catch {
    companies.value = [];
    topList.value = [];
  }
}

onMounted(load);
watch(() => projectStore.currentProjectId, load);
</script>

<style scoped>
.chart {
  width: 100%;
  height: 420px;
}
</style>
