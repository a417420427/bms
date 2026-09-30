<template>
  <el-card shadow="never">
    <template #header>
      项目管理
      <el-text v-if="!userStore.isSystemAdmin" type="info" size="small" style="margin-left: 12px">
        仅系统管理员可操作
      </el-text>
    </template>
    <div v-if="userStore.isSystemAdmin" style="margin-bottom: 12px">
      <el-button type="primary" @click="openEdit()">新增项目</el-button>
    </div>
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="projectName" label="项目名称" min-width="160" />
      <el-table-column prop="statusText" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.disabled ? 'danger' : 'success'" size="small">
            {{ row.disabled ? "已停用" : "启用中" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170" />
      <el-table-column v-if="userStore.isSystemAdmin" label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link :type="row.disabled ? 'success' : 'danger'" @click="toggle(row)">
            {{ row.disabled ? "启用" : "停用" }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑项目' : '新增项目'" width="420px">
      <el-form :model="dialogForm" label-width="80px">
        <el-form-item label="项目名称" required>
          <el-input v-model="dialogForm.projectName" placeholder="请输入项目名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import request from "@/utils/request";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const loading = ref(false);
const list = ref([]);
const dialogVisible = ref(false);
const editingId = ref("");
const dialogForm = reactive({ projectName: "" });

onMounted(load);

async function load() {
  loading.value = true;
  try {
    // TODO: 对接 GET /api/admin/projects
  } finally {
    loading.value = false;
  }
}

function openEdit(row) {
  editingId.value = row?.id || "";
  dialogForm.projectName = row?.projectName || "";
  dialogVisible.value = true;
}

async function save() {
  if (!dialogForm.projectName.trim()) return ElMessage.warning("请输入项目名称");
  // POST/PUT /api/admin/projects（受 requireSystemAdmin 保护）
  if (editingId.value) {
    await request.put(`/admin/projects/${editingId.value}`, dialogForm);
  } else {
    await request.post("/admin/projects", dialogForm);
  }
  ElMessage.success("已保存");
  dialogVisible.value = false;
  load();
}

async function toggle(row) {
  await request.put(`/admin/projects/${row.id}`, { disabled: !row.disabled });
  ElMessage.success(row.disabled ? "已启用" : "已停用");
  load();
}
</script>
