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
        <el-input
          v-model="query.operator"
          placeholder="操作人员"
          style="width: 140px"
          clearable
          @keyup.enter="search"
        />
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
        <el-button type="primary" @click="search">查询</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column label="日志类型" min-width="140">
        <template #default="{ row }">{{ ACTION_TEXT[row.action] || row.action || "-" }}</template>
      </el-table-column>
      <el-table-column prop="target" label="操作内容" min-width="280" show-overflow-tooltip>
        <template #default="{ row }">{{ row.target || "-" }}</template>
      </el-table-column>
      <el-table-column prop="operatorName" label="操作人员" width="110">
        <template #default="{ row }">{{ row.operatorName || row.operator?.realName || row.operator?.username || "-" }}</template>
      </el-table-column>
      <el-table-column label="所属项目" min-width="120">
        <template #default="{ row }">{{ projectName(row.projectId) }}</template>
      </el-table-column>
      <el-table-column prop="ip" label="IP" width="130">
        <template #default="{ row }">{{ row.ip || "-" }}</template>
      </el-table-column>
      <el-table-column label="操作时间" width="170">
        <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
      </el-table-column>
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

// 日志类型映射（与后端 AUDIT_ACTION 对齐）
const ACTION_TEXT = {
  CUSTOMER_CREATE: "客户录入",
  CUSTOMER_UPDATE: "客户信息修改",
  CUSTOMER_INTENT_CHANGE: "意向等级变更",
  CUSTOMER_ASSIGN: "归属变更",
  MOVE_PUBLIC: "移入公共池",
  CLAIM_PUBLIC: "公共池认领",
  CLAIM_UNVISITED: "未到访申领",
  APPROVE: "审批",
  CHANNEL_ARRIVE: "渠道到访",
  CHANNEL_RE_REPORT: "重新报备",
  CHANNEL_EXPIRE: "渠道过期",
  FOLLOWUP_CREATE: "新增跟进",
  EXPORT: "数据导出",
  USER_RESET_PASSWORD: "重置密码",
  USER_CREATE: "新增账号",
  USER_UPDATE: "账号变更",
  PROJECT_CREATE: "新增项目",
  PROJECT_UPDATE: "项目变更",
  COMPANY_CREATE: "新增公司",
  COMPANY_UPDATE: "公司变更",
  CONFIG_UPDATE: "配置修改",
  CHECKIN_CREATE: "打卡签到",
};

function fmtTime(t) {
  return t ? new Date(t).toLocaleString("zh-CN", { hour12: false }) : "-";
}

const projectStore = useProjectStore();
const loading = ref(false);
const list = ref([]);
const total = ref(0);

const query = reactive({ projectId: "", operator: "", range: null, page: 1, pageSize: 20 });

function projectName(id) {
  if (!id) return "—";
  return projectStore.projects.find((p) => p.projectId === id)?.projectName || "-";
}

async function load() {
  loading.value = true;
  try {
    // GET /api/admin/audit-logs → { list, total }（操作人员按关键字模糊匹配）
    const data = await request.get("/admin/audit-logs", {
      params: {
        projectId: query.projectId || undefined,
        keyword: query.operator || undefined,
        startDate: query.range?.[0] || undefined,
        endDate: query.range?.[1] ? `${query.range[1]} 23:59:59` : undefined,
        page: query.page,
        pageSize: query.pageSize,
      },
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
  query.page = 1;
  load();
}

onMounted(load);
</script>
