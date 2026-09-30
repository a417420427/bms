<template>
  <el-card shadow="never">
    <template #header>客户数据导出（导出操作将记录日志）</template>
    <el-form :model="form" label-width="100px" style="max-width: 640px">
      <el-form-item label="所属项目">
        <el-select v-model="form.projectId" clearable placeholder="全部项目" style="width: 100%">
          <el-option
            v-for="p in projectStore.projects"
            :key="p.projectId"
            :label="p.projectName"
            :value="p.projectId"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="时间范围">
        <el-date-picker
          v-model="form.range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
        />
      </el-form-item>
      <el-form-item label="客户来源">
        <el-select v-model="form.sourceType" clearable placeholder="全部来源" style="width: 100%">
          <el-option label="销售员录入" value="SALES" />
          <el-option label="渠道公司推荐" value="CHANNEL_COMPANY" />
          <el-option label="个人推荐" value="PERSONAL_REFERRAL" />
        </el-select>
      </el-form-item>
      <el-form-item label="归属人">
        <el-input v-model="form.owner" placeholder="归属人" clearable />
      </el-form-item>
      <el-form-item label="意向等级">
        <el-select v-model="form.intentLevel" clearable placeholder="全部" style="width: 100%">
          <el-option v-for="lv in ['A', 'B', 'C', 'D']" :key="lv" :label="lv" :value="lv" />
        </el-select>
      </el-form-item>
      <el-form-item label="客户状态">
        <el-select v-model="form.status" clearable placeholder="全部" style="width: 100%">
          <el-option label="正常跟进" value="FOLLOWING" />
          <el-option label="已成交" value="DEAL" />
          <el-option label="公共池" value="PUBLIC" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="exporting" @click="handleExport">导出 Excel</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { useProjectStore } from "@/stores/project";
import request from "@/utils/request";

const projectStore = useProjectStore();
const exporting = ref(false);
const form = reactive({
  projectId: "",
  range: null,
  sourceType: "",
  owner: "",
  intentLevel: "",
  status: "",
});

async function handleExport() {
  exporting.value = true;
  try {
    // POST /api/admin/export-customers → 文件流
    // 后端强制记录导出日志：导出账号、导出时间、筛选条件
    const resp = await request.post(
      "/admin/export-customers",
      {
        projectId: form.projectId,
        startTime: form.range?.[0],
        endTime: form.range?.[1],
        sourceType: form.sourceType,
        owner: form.owner,
        intentLevel: form.intentLevel,
        status: form.status,
      },
      { responseType: "blob" }
    );
    const url = URL.createObjectURL(resp);
    const a = document.createElement("a");
    a.href = url;
    a.download = `客户数据_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("导出成功");
  } finally {
    exporting.value = false;
  }
}
</script>
