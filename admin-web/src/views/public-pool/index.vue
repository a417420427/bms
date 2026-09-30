<template>
  <div>
    <el-card shadow="never" style="margin-bottom: 16px">
      <template #header>公共池客户</template>
      <el-form inline>
        <el-form-item>
          <el-input v-model="keyword" placeholder="姓名 / 手机号" clearable @keyup.enter="search" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="search">查询</el-button>
        </el-form-item>
      </el-form>
      <el-table v-loading="loading" :data="list" border stripe>
        <el-table-column label="姓名" min-width="90">
          <template #default="{ row }">{{ row.customer?.name || "-" }}</template>
        </el-table-column>
        <el-table-column label="手机号" min-width="120">
          <template #default="{ row }">{{ row.customer?.phone || "-" }}</template>
        </el-table-column>
        <el-table-column label="来源" min-width="110">
          <template #default="{ row }">{{ SOURCE_TEXT[row.customer?.source] || row.customer?.source || "-" }}</template>
        </el-table-column>
        <el-table-column label="意向等级" width="90">
          <template #default="{ row }">{{ INTENT_TEXT[row.customer?.intentLevel] || row.customer?.intentLevel || "-" }}</template>
        </el-table-column>
        <el-table-column label="原归属人" min-width="100">
          <template #default="{ row }">{{ userName(row.customer?.owner) || userName(row.previousOwner) || "-" }}</template>
        </el-table-column>
        <el-table-column label="合作公司" min-width="120">
          <template #default="{ row }">{{ row.customer?.company?.name || "-" }}</template>
        </el-table-column>
        <el-table-column prop="reason" label="移入原因" min-width="140">
          <template #default="{ row }">{{ row.reason || "-" }}</template>
        </el-table-column>
        <el-table-column label="移入公共池时间" min-width="160">
          <template #default="{ row }">{{ fmtTime(row.releasedAt) }}</template>
        </el-table-column>
      </el-table>
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next, sizes"
        style="margin-top: 16px; justify-content: flex-end"
        @change="load"
      />
      <el-empty v-if="!loading && !list.length" description="公共池暂无客户" />
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

// 枚举中文映射（与客户列表页保持一致）
const SOURCE_TEXT = {
  SELF_VISIT: "自访",
  SELF_DEVELOP: "自拓",
  CHANNEL_COMPANY: "渠道公司推荐",
  PERSONAL_REFERRAL: "个人推荐",
};
const INTENT_TEXT = { HIGH: "高意向", MEDIUM: "中意向", LOW: "低意向", NONE: "无意向" };

function fmtTime(t) {
  return t ? new Date(t).toLocaleString("zh-CN", { hour12: false }) : "-";
}
function userName(u) {
  return u?.realName || u?.username || "";
}

const projectStore = useProjectStore();
const loading = ref(false);
const keyword = ref("");
const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);
const claims = ref([]);
const claimsLoading = ref(false);

async function load() {
  loading.value = true;
  try {
    // GET /api/admin/public-pool → { list, total }（list 项含 customer/populated、reason、releasedAt）
    const data = await request.get("/admin/public-pool", {
      params: { keyword: keyword.value || undefined, page: page.value, pageSize: pageSize.value },
    });
    list.value = data.list || [];
    total.value = data.total || 0;
  } catch {
    list.value = [];
    total.value = 0;
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

function search() {
  page.value = 1;
  load();
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
