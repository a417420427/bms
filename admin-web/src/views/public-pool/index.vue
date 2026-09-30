<template>
  <div>
    <el-card shadow="never" style="margin-bottom: 16px">
      <template #header>公共池客户</template>
      <el-form inline>
        <el-form-item>
          <el-input v-model="keyword" placeholder="姓名 / 手机号" clearable @keyup.enter="load" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
        </el-form-item>
      </el-form>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column prop="name" label="姓名" min-width="90" />
        <el-table-column prop="phone" label="手机号" min-width="120" />
        <el-table-column prop="sourceText" label="来源" min-width="110" />
        <el-table-column prop="intentLevel" label="意向等级" width="90" />
        <el-table-column prop="movedInTime" label="移入公共池时间" min-width="160" />
      </el-table>
    </el-card>

    <el-card shadow="never">
      <template #header>认领审批（销售员提交的申请）</template>
      <el-table v-loading="claimsLoading" :data="claims" border stripe>
        <el-table-column label="申请销售员" min-width="110">
          <template #default="{ row }">{{ row.applicant?.realName || row.applicant?.username || "-" }}</template>
        </el-table-column>
        <el-table-column label="客户姓名" min-width="90">
          <template #default="{ row }">{{ row.customerId?.name || "-" }}</template>
        </el-table-column>
        <el-table-column label="手机号" min-width="120">
          <template #default="{ row }">{{ row.customerId?.phone || "-" }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" label="申请时间" min-width="160" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="success" size="small" @click="approve(row, 'APPROVED')">同意</el-button>
            <el-button type="danger" size="small" @click="approve(row, 'REJECTED')">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!claimsLoading && !claims.length" description="暂无待审批的认领申请" />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import request from "@/utils/request";
import { useProjectStore } from "@/stores/project";

const projectStore = useProjectStore();
const loading = ref(false);
const keyword = ref("");
const list = ref([]);
const claims = ref([]);
const claimsLoading = ref(false);

async function load() {
  loading.value = true;
  try {
    // TODO: 对接 GET /api/admin/public-pool（管理员视角全量，字段映射待补）
  } finally {
    loading.value = false;
  }
  claimsLoading.value = true;
  try {
    // GET /api/admin/public-pool/claims → { list, total }
    const data = await request.get("/admin/public-pool/claims", { params: { page: 1, pageSize: 50 } });
    claims.value = data.list || [];
  } catch {
    claims.value = [];
  } finally {
    claimsLoading.value = false;
  }
}

async function approve(row, result) {
  // POST /api/admin/approve-claim { approvalId, result }
  // 同意：客户归属销售员；驳回：退回公共池；审批写日志
  await request.post("/admin/approve-claim", { approvalId: row._id, result });
  ElMessage.success(result === "APPROVED" ? "已同意，客户归属该销售员" : "已驳回，客户退回公共池");
  load();
}

onMounted(load);
</script>
