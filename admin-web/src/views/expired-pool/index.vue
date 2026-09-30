<template>
  <el-card shadow="never">
    <template #header>
      过期客户池管理
      <el-text type="info" size="small" style="margin-left: 12px">管理员仅查看，不可编辑</el-text>
    </template>
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="name" label="姓名" min-width="90" />
      <el-table-column prop="phone" label="手机号（脱敏）" min-width="130" />
      <el-table-column prop="recommendTypeText" label="推荐类型" min-width="110" />
      <el-table-column prop="originReferrer" label="原合作公司/原经纪人" min-width="150" />
      <el-table-column prop="originReportTime" label="原推荐时间" min-width="160" />
      <el-table-column prop="expiredTime" label="过期时间" min-width="160" />
      <el-table-column label="原始报备记录" width="120">
        <template #default="{ row }">
          <el-button link type="primary" @click="viewOrigin(row)">查看</el-button>
        </template>
      </el-table-column>
      <el-table-column label="是否重新报备" width="120">
        <template #default="{ row }">
          <el-tag :type="row.reReported ? 'success' : 'info'" size="small">
            {{ row.reReported ? "已重报" : "未重报" }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup>
import { onMounted, ref } from "vue";
import request from "@/utils/request";

const loading = ref(false);
const list = ref([]);

onMounted(load);

async function load() {
  loading.value = true;
  try {
    // TODO: 对接 GET /api/admin/expired-pool
    // list.value = await request.get("/admin/expired-pool");
  } finally {
    loading.value = false;
  }
}

function viewOrigin(row) {
  // 展示原始报备记录（弹窗或抽屉），对接后补充
  console.log("view origin:", row);
}
</script>
