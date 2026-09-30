<template>
  <el-card shadow="never">
    <template #header>
      过期客户池管理
      <el-text type="info" size="small" style="margin-left: 12px">管理员仅查看，不可编辑</el-text>
    </template>
    <el-form inline>
      <el-form-item>
        <el-input
          v-model="keyword"
          placeholder="公司名称 / 推荐人"
          clearable
          @keyup.enter="search"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">查询</el-button>
      </el-form-item>
    </el-form>
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column label="姓名" min-width="90">
        <template #default="{ row }">{{ row.customerId?.name || "-" }}</template>
      </el-table-column>
      <el-table-column label="手机号（脱敏）" min-width="130">
        <template #default="{ row }">{{ row.customerId?.phone || "-" }}</template>
      </el-table-column>
      <el-table-column label="来源类型" min-width="110">
        <template #default="{ row }">{{ SOURCE_TEXT[row.source || row.customerId?.source] || "-" }}</template>
      </el-table-column>
      <el-table-column label="渠道员" min-width="100">
        <template #default="{ row }">{{ row.channelUser?.realName || row.channelUser?.username || row.channelUserName || "-" }}</template>
      </el-table-column>
      <el-table-column label="原合作公司/原经纪人" min-width="150">
        <template #default="{ row }">{{ row.companyName || row.company?.name || row.referrerName || row.customerId?.referrerName || "-" }}</template>
      </el-table-column>
      <el-table-column label="过期时间" min-width="160">
        <template #default="{ row }">{{ fmtTime(row.expiredAt) }}</template>
      </el-table-column>
      <el-table-column label="是否重新报备" width="120">
        <template #default="{ row }">
          <el-tag :type="row.reReported ? 'success' : 'info'" size="small">
            {{ row.reReported ? "已重报" : "未重报" }}
          </el-tag>
        </template>
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
    <el-empty v-if="!loading && !list.length" description="过期池暂无客户" />
  </el-card>
</template>

<script setup>
import { onMounted, ref } from "vue";
import request from "@/utils/request";

// 来源中文映射（与客户列表页保持一致）
const SOURCE_TEXT = {
  SELF_VISIT: "自访",
  SELF_DEVELOP: "自拓",
  CHANNEL_COMPANY: "渠道公司推荐",
  PERSONAL_REFERRAL: "个人推荐",
};

function fmtTime(t) {
  return t ? new Date(t).toLocaleString("zh-CN", { hour12: false }) : "-";
}

const loading = ref(false);
const keyword = ref("");
const list = ref([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(20);

onMounted(load);

async function load() {
  loading.value = true;
  try {
    // GET /api/admin/expired-pool → { list, total }（只读）
    const data = await request.get("/admin/expired-pool", {
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
}

function search() {
  page.value = 1;
  load();
}
</script>
