<template>
  <el-card shadow="never">
    <!-- 筛选区：项目 / 来源类型 / 归属人 / 意向等级 / 客户状态 / 时间范围 -->
    <el-form inline>
      <el-form-item label="项目">
        <el-select v-model="query.projectId" clearable placeholder="全部项目" style="width: 160px" />
      </el-form-item>
      <el-form-item label="来源类型">
        <el-select v-model="query.sourceType" clearable placeholder="全部来源" style="width: 150px">
          <el-option label="销售员录入" value="SALES" />
          <el-option label="渠道公司推荐" value="CHANNEL_COMPANY" />
          <el-option label="个人推荐" value="PERSONAL_REFERRAL" />
        </el-select>
      </el-form-item>
      <el-form-item label="归属人">
        <el-input v-model="query.owner" placeholder="归属人" style="width: 130px" />
      </el-form-item>
      <el-form-item label="意向等级">
        <el-select v-model="query.intentLevel" clearable placeholder="全部" style="width: 110px">
          <el-option v-for="lv in ['A', 'B', 'C', 'D']" :key="lv" :label="lv" :value="lv" />
        </el-select>
      </el-form-item>
      <el-form-item label="客户状态">
        <el-select v-model="query.status" clearable placeholder="全部" style="width: 130px">
          <el-option label="正常跟进" value="FOLLOWING" />
          <el-option label="已成交" value="DEAL" />
          <el-option label="公共池" value="PUBLIC" />
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
          @keyup.enter="load"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="load">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="name" label="姓名" min-width="90" />
      <el-table-column prop="phone" label="手机号" min-width="120" />
      <el-table-column prop="sourceTypeText" label="来源类型" min-width="110" />
      <el-table-column prop="ownerName" label="归属人" min-width="90" />
      <el-table-column prop="projectName" label="所属项目" min-width="120" />
      <el-table-column prop="intentLevel" label="意向等级" width="90" />
      <el-table-column prop="lastFollowupTime" label="最近跟进时间" min-width="160" />
      <el-table-column prop="statusText" label="客户状态" width="100" />
      <el-table-column label="操作" width="80" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="$router.push(`/customers/${row.id}`)">详情</el-button>
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
import { useProjectStore } from "@/stores/project";

const projectStore = useProjectStore();
const loading = ref(false);
const list = ref([]);
const total = ref(0);

const query = reactive({
  projectId: "",
  sourceType: "",
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
    // TODO: 对接 GET /api/admin/customers
    // list.value = await request.get("/admin/customers", { params: buildParams() });
  } finally {
    loading.value = false;
  }
}

function reset() {
  Object.assign(query, {
    projectId: "",
    sourceType: "",
    owner: "",
    intentLevel: "",
    status: "",
    range: null,
    keyword: "",
    page: 1,
  });
  load();
}

onMounted(load);
watch(() => projectStore.currentProjectId, load);
</script>
