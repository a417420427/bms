<template>
  <el-card shadow="hover" class="stat-card" :class="{ danger: danger }">
    <div class="stat-value" :class="{ 'danger-text': danger }">{{ modelValue ?? "-" }}</div>
    <div class="stat-label">{{ label }}</div>
  </el-card>
</template>

<script setup>
defineProps({
  modelValue: { type: [Number, String], default: "-" },
  label: { type: String, required: true },
  danger: { type: Boolean, default: false },
});
</script>

<style scoped>
.stat-card {
  text-align: center;
  cursor: pointer;
}
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}
.stat-label {
  margin-top: 8px;
  font-size: 13px;
  color: #909399;
}
.danger {
  border-color: #f56c6c;
}
.danger-text {
  color: #f56c6c;
}
</style>
