<template>
  <el-card shadow="never">
    <template #header>
      操作日志
      <el-text type="info" size="small" style="margin-left: 12px">日志不可删除</el-text>
    </template>
    <el-form inline>
      <el-form-item label="项目">
        <el-select v-model="query.projectId" clearable placeholder="全部项目" style="width: 160px">
          <el-option
            v-for="p in projectStore.projects"
            :key="p.projectId"
            :label="p.projectName"
            :value="p.projectId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="操作人员">
        <el-input v-model="query.operator" placeholder="操作人员" style="width: 140px" clearable />
      </el-form-item>
      <el-form-item label="时间范围">
        <el-date-picker
          v-model="query.range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始"
          end-placeholder="结束"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="actionText" label="日志类型" min-width="140" />
      <el-table-column prop="content" label="操作内容" min-width="280" show-overflow-tooltip />
      <el-table-column prop="operatorName" label="操作人员" width="110" />
      <el-table-column prop="projectName" label="所属项目" min-width="120" />
      <el-table-column prop="time" label="操作时间" width="170" />
    </el-table>

    <el-pagination
      v-model:current-page="query.page"
      v-model:page-size="query.pageSize"
      :total="total"
      layout="total, prev, pager, next, sizes"
      style="margin-top: 16px; justify-content: flex-end"
      @change="load"
    />
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import request from "@/utils/request";
import { useProjectStore } from "@/stores/project";

const projectStore = useProjectStore();
const loading = ref(false);
const list = ref([]);
const total = ref(0);

const query = reactive({ projectId: "", operator: "", range: null, page: 1, pageSize: 20 });

// 日志类型：客户信息修改、归属变更、移入公共池、认领审批、未到访申领审批、渠道过期、重新报备、数据导出
async function load() {
  loading.value = true;
  try {
    // TODO: 对接 GET /api/admin/audit-logs
    // const data = await request.get("/admin/audit-logs", { params: query });
    // list.value = data.list;
    // total.value = data.total;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>
