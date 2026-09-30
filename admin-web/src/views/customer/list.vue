<template>
  <el-card shadow="never">
    <!-- 筛选区：项目 / 来源类型 / 归属人 / 意向等级 / 客户状态 / 时间范围 -->
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
      <el-form-item label="来源类型">
        <el-select v-model="query.source" clearable placeholder="全部来源" style="width: 150px">
          <el-option v-for="(text, key) in SOURCE_TEXT" :key="key" :label="text" :value="key" />
        </el-select>
      </el-form-item>
      <el-form-item label="归属人">
        <el-select v-model="query.owner" clearable filterable placeholder="全部归属人" style="width: 140px">
          <el-option
            v-for="u in ownerOptions"
            :key="u._id"
            :label="u.realName || u.username"
            :value="u._id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="意向等级">
        <el-select v-model="query.intentLevel" clearable placeholder="全部" style="width: 110px">
          <el-option v-for="(text, key) in INTENT_TEXT" :key="key" :label="text" :value="key" />
        </el-select>
      </el-form-item>
      <el-form-item label="客户状态">
        <el-select v-model="query.status" clearable placeholder="全部" style="width: 130px">
          <el-option v-for="(text, key) in STATUS_TEXT" :key="key" :label="text" :value="key" />
        </el-select>
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
        <el-input
          v-model="query.keyword"
          placeholder="姓名 / 手机号"
          clearable
          style="width: 180px"
          @keyup.enter="search"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="search">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="name" label="姓名" min-width="90" />
      <el-table-column prop="phone" label="手机号" min-width="120" />
      <el-table-column label="来源类型" min-width="120">
        <template #default="{ row }">{{ SOURCE_TEXT[row.source] || row.source || "-" }}</template>
      </el-table-column>
      <el-table-column label="归属人" min-width="90">
        <template #default="{ row }">{{ row.owner?.realName || row.owner?.username || "-" }}</template>
      </el-table-column>
      <el-table-column label="所属项目" min-width="120">
        <template #default="{ row }">{{ row.projectId?.name || "-" }}</template>
      </el-table-column>
      <el-table-column label="意向等级" width="90">
        <template #default="{ row }">{{ INTENT_TEXT[row.intentLevel] || row.intentLevel || "-" }}</template>
      </el-table-column>
      <el-table-column label="最近跟进时间" min-width="160">
        <template #default="{ row }">{{ fmtTime(row.lastFollowupAt) }}</template>
      </el-table-column>
      <el-table-column label="客户状态" width="100">
        <template #default="{ row }">{{ STATUS_TEXT[row.status] || row.status || "-" }}</template>
      </el-table-column>
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="$router.push(`/customers/${row._id}`)">详情</el-button>
        </template>
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
import { onMounted, reactive, ref, watch } from "vue";
import request from "@/utils/request";
import { useProjectStore } from "@/stores/project";

// 枚举中文映射（与 create.vue / boards/warning.vue 保持一致）
const SOURCE_TEXT = {
  SELF_VISIT: "自访",
  SELF_DEVELOP: "自拓",
  CHANNEL_COMPANY: "渠道公司推荐",
  PERSONAL_REFERRAL: "个人推荐",
};
const INTENT_TEXT = { HIGH: "高意向", MEDIUM: "中意向", LOW: "低意向", NONE: "无意向" };
const STATUS_TEXT = {
  ACTIVE: "跟进中",
  DEAL: "已成交",
  PUBLIC_POOL: "公共池",
  EXPIRED: "已过期",
  UNVISITED: "未到访",
};

function fmtTime(t) {
  return t ? new Date(t).toLocaleString("zh-CN", { hour12: false }) : "-";
}

const projectStore = useProjectStore();
const loading = ref(false);
const list = ref([]);
const total = ref(0);
const ownerOptions = ref([]);

const query = reactive({
  projectId: "",
  source: "",
  owner: "",
  intentLevel: "",
  status: "",
  range: null,
  keyword: "",
  page: 1,
  pageSize: 20,
});

async function load() {
  loading.value = true;
  try {
    // GET /api/admin/customers → { list, total, page, pageSize }
    const data = await request.get("/admin/customers", {
      params: {
        projectId: query.projectId || undefined,
        source: query.source || undefined,
        owner: query.owner || undefined,
        intentLevel: query.intentLevel || undefined,
        status: query.status || undefined,
        startDate: query.range?.[0] || undefined,
        endDate: query.range?.[1] ? `${query.range[1]} 23:59:59` : undefined,
        keyword: query.keyword || undefined,
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

function reset() {
  Object.assign(query, {
    projectId: "",
    source: "",
    owner: "",
    intentLevel: "",
    status: "",
    range: null,
    keyword: "",
    page: 1,
  });
  load();
}

async function loadOwners() {
  // GET /api/admin/users → 归属人下拉（销售员/渠道员）
  try {
    const users = await request.get("/admin/users", { params: { pageSize: 100 } });
    ownerOptions.value = (users || []).filter((u) => u.role !== "ROLE_ADMIN");
  } catch {
    ownerOptions.value = [];
  }
}

onMounted(() => {
  load();
  loadOwners();
});
watch(() => projectStore.currentProjectId, search);
</script>
