<template>
  <el-row :gutter="16">
    <el-col :span="14">
      <el-card shadow="never">
        <template #header>销售员业绩对比</template>
        <div ref="el" class="chart"></div>
      </el-card>
    </el-col>
    <el-col :span="10">
      <el-card shadow="never">
        <template #header>销售员排行榜</template>
        <el-table :data="ranking" border stripe>
          <el-table-column type="index" label="排名" width="70" />
          <el-table-column prop="name" label="销售员" min-width="90" />
          <el-table-column prop="customerCount" label="客户数" width="90" />
          <el-table-column prop="dealCount" label="成交数" width="90" />
          <el-table-column prop="followupRate" label="跟进及时率" width="110" />
        </el-table>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useEcharts } from "@/composables/useEcharts";
import { getSalesStatsApi } from "@/api/dashboard";
import { useProjectStore } from "@/stores/project";

const projectStore = useProjectStore();
const ranking = ref([]);

const names = computed(() => ranking.value.map((r) => r.name));
const customerCounts = computed(() => ranking.value.map((r) => r.customerCount));
const visitCounts = computed(() => ranking.value.map((r) => r.visitCount));
const dealCounts = computed(() => ranking.value.map((r) => r.dealCount));

const option = computed(() => ({
  tooltip: { trigger: "axis" },
  legend: { data: ["客户数", "到访数", "成交数"] },
  grid: { left: 40, right: 20, bottom: 30, containLabel: true },
  xAxis: { type: "category", data: names.value },
  yAxis: { type: "value" },
  series: [
    { name: "客户数", type: "bar", data: customerCounts.value },
    { name: "到访数", type: "bar", data: visitCounts.value },
    { name: "成交数", type: "bar", data: dealCounts.value },
  ],
}));

const { el } = useEcharts(option);

async function load() {
  if (!projectStore.currentProjectId) return;
  try {
    // GET /api/admin/stats/sales → { list: [{ name, customerCount, visitCount, dealCount, followupRate }] }
    const data = await getSalesStatsApi();
    ranking.value = data?.list || [];
  } catch {
    ranking.value = [];
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
