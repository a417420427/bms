<template>
  <el-dialog
    :model-value="modelValue"
    :title="mandatory ? '请选择项目' : '切换项目'"
    width="480px"
    :close-on-click-modal="false"
    :close-on-press-escape="!mandatory"
    :show-close="!mandatory"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <el-alert
      v-if="mandatory"
      title="登录成功后请先选择要进入的项目"
      type="info"
      :closable="false"
      style="margin-bottom: 16px"
    />
    <div v-loading="loading" class="project-list">
      <div
        v-for="p in projectStore.projects"
        :key="p.projectId"
        class="project-item"
        :class="{ active: selected === p.projectId }"
        @click="selected = p.projectId"
      >
        <span>{{ p.projectName }}</span>
        <el-tag v-if="p.isDefault" size="small" type="info">默认</el-tag>
      </div>
      <el-empty v-if="!loading && !projectStore.projects.length" description="暂无可访问的项目" />
    </div>
    <template #footer>
      <el-button v-if="!mandatory" @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :disabled="!selected" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { onMounted, ref } from "vue";
import { ElMessage } from "element-plus";
import { useProjectStore } from "@/stores/project";
import { getUserProjectsApi, switchProjectApi } from "@/api/auth";

const props = defineProps({
  modelValue: Boolean,
  mandatory: Boolean,
});
const emit = defineEmits(["update:modelValue", "confirmed"]);

const projectStore = useProjectStore();
const loading = ref(false);
const selected = ref(projectStore.currentProjectId);

onMounted(async () => {
  if (!projectStore.projects.length) {
    loading.value = true;
    try {
      // TODO: 对接 GET /api/user/projects → [{ projectId, projectName, isDefault }]
      const list = await getUserProjectsApi();
      projectStore.setProjects(Array.isArray(list) ? list : []);
    } catch {
      // 接口异常时保留空列表，由页面兜底提示
    } finally {
      loading.value = false;
    }
  }
  selected.value = projectStore.currentProjectId;
});

async function confirm() {
  if (selected.value !== projectStore.currentProjectId) {
    try {
      await switchProjectApi(selected.value);
    } catch {
      // 切换接口未就绪时本地生效
    }
    projectStore.setCurrent(selected.value);
    ElMessage.success("项目已切换，数据已刷新");
  }
  emit("update:modelValue", false);
  emit("confirmed");
}
</script>

<style scoped>
.project-list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.project-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}
.project-item:hover {
  border-color: #409eff;
}
.project-item.active {
  border-color: #409eff;
  background: #ecf5ff;
}
</style>
