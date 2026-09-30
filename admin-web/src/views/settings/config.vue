<template>
  <el-card shadow="never" style="max-width: 640px">
    <template #header>
      系统参数配置
      <el-text v-if="!userStore.isSystemAdmin" type="info" size="small" style="margin-left: 12px">
        仅系统管理员可保存
      </el-text>
    </template>
    <el-form v-loading="loading" :model="form" label-width="220px">
      <el-form-item label="客户无跟进自动进公共池天数">
        <el-input-number v-model="form.publicPoolRetentionDays" :min="1" :max="365" />
        <span class="unit">天（默认 30）</span>
      </el-form-item>
      <el-form-item label="无跟进预警天数">
        <el-input-number v-model="form.followupReminderDays" :min="1" :max="365" />
        <span class="unit">天（默认 30）</span>
      </el-form-item>
      <el-form-item label="渠道报备自动过期时长">
        <el-input-number v-model="form.channelExpireHours" :min="1" :max="168" />
        <span class="unit">小时（默认 24）</span>
      </el-form-item>
      <el-form-item label="销售员到访时间最大偏移">
        <el-input-number v-model="form.visitMaxOffsetHours" :min="1" :max="72" />
        <span class="unit">小时（默认 4）</span>
      </el-form-item>
      <el-form-item label="渠道推荐时间最大偏移">
        <el-input-number v-model="form.channelMaxOffsetHours" :min="1" :max="72" />
        <span class="unit">小时（默认 4）</span>
      </el-form-item>
      <el-form-item label="过期池保留天数">
        <el-input-number v-model="form.expiredPoolRetentionDays" :min="1" :max="365" />
        <span class="unit">天（默认 7）</span>
      </el-form-item>
      <el-form-item v-if="userStore.isSystemAdmin">
        <el-button type="primary" :loading="saving" @click="save">保存配置</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import request from "@/utils/request";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const loading = ref(false);
const saving = ref(false);
// 键名与后端 SystemConfig 模型 / PUT /admin/config 白名单对齐
const form = reactive({
  publicPoolRetentionDays: 30,
  followupReminderDays: 30,
  channelExpireHours: 24,
  visitMaxOffsetHours: 4,
  channelMaxOffsetHours: 4,
  expiredPoolRetentionDays: 7,
});

onMounted(async () => {
  loading.value = true;
  try {
    // GET /api/admin/config → 全局默认配置（不传 projectId）
    const data = await request.get("/admin/config");
    Object.keys(form).forEach((k) => {
      if (data?.[k] != null) form[k] = data[k];
    });
  } finally {
    loading.value = false;
  }
});

async function save() {
  saving.value = true;
  try {
    // PUT /api/admin/config（白名单键，全局配置）
    await request.put("/admin/config", { ...form });
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
