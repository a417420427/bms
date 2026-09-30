<template>
  <el-card shadow="never">
    <template #header>未到访申领审批</template>
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column label="申领销售员" min-width="110">
        <template #default="{ row }">{{ row.applicant?.realName || row.applicant?.username || "-" }}</template>
      </el-table-column>
      <el-table-column label="客户姓名" min-width="90">
        <template #default="{ row }">{{ row.customerId?.name || "-" }}</template>
      </el-table-column>
      <el-table-column label="手机号（脱敏）" min-width="130">
        <template #default="{ row }">{{ row.customerId?.phone || "-" }}</template>
      </el-table-column>
      <el-table-column prop="createdAt" label="申请时间" min-width="160" />
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button type="success" size="small" @click="approve(row, 'APPROVED')">审批同意</el-button>
          <el-button type="danger" size="small" @click="approve(row, 'REJECTED')">审批驳回</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && !list.length" description="暂无待审批的申领" />
  </el-card>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import request from "@/utils/request";

const loading = ref(false);
const list = ref([]);

onMounted(load);

async function load() {
  loading.value = true;
  try {
    // GET /api/admin/unvisited-approvals → { list, total }
    const data = await request.get("/admin/unvisited-approvals", { params: { page: 1, pageSize: 50 } });
    list.value = data.list || [];
  } catch {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

async function approve(row, result) {
  // POST /api/admin/approve-unvisited { approvalId, result }
  // 同意：客户归属申领销售员；驳回：退回未到访申领池；全部动作记录日志
  await request.post("/admin/approve-unvisited", { approvalId: row._id, result });
  ElMessage.success(result === "APPROVED" ? "已同意，客户归属申领销售员" : "已驳回，客户退回未到访申领池");
  load();
}
</script>
