<template>
  <el-card shadow="never" style="max-width: 640px">
    <template #header>系统参数配置</template>
    <el-form v-loading="loading" :model="form" label-width="220px">
      <el-form-item label="客户无跟进自动进公共池天数">
        <el-input-number v-model="form.publicPoolDays" :min="1" :max="365" />
        <span class="unit">天（默认 30）</span>
      </el-form-item>
      <el-form-item label="渠道报备自动过期时长">
        <el-input-number v-model="form.channelExpireHours" :min="1" :max="168" />
        <span class="unit">小时（默认 24）</span>
      </el-form-item>
      <el-form-item label="销售员到访时间最大偏移">
        <el-input-number v-model="form.salesVisitOffsetHours" :min="1" :max="72" />
        <span class="unit">小时（默认 4）</span>
      </el-form-item>
      <el-form-item label="渠道推荐时间最大偏移">
        <el-input-number v-model="form.channelReportOffsetHours" :min="1" :max="72" />
        <span class="unit">小时（默认 4）</span>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="saving" @click="save">保存配置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import request from "@/utils/request";

const loading = ref(false);
const saving = ref(false);
const form = reactive({
  publicPoolDays: 30,
  channelExpireHours: 24,
  salesVisitOffsetHours: 4,
  channelReportOffsetHours: 4,
});

onMounted(async () => {
  loading.value = true;
  try {
    // TODO: 对接 GET /api/admin/config
    // Object.assign(form, await request.get("/admin/config"));
  } finally {
    loading.value = false;
  }
});

async function save() {
  saving.value = true;
  try {
    // PUT /api/admin/config
    await request.put("/admin/config", form);
    ElMessage.success("配置已保存");
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.unit {
  margin-left: 8px;
  color: #909399;
}
</style>
