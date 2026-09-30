<template>
  <el-card shadow="never">
    <template #header>
      账号角色管理
      <el-text v-if="!userStore.isSystemAdmin" type="info" size="small" style="margin-left: 12px">
        仅系统管理员可操作
      </el-text>
    </template>
    <div style="margin-bottom: 12px">
      <el-form inline>
        <el-form-item>
          <el-select v-model="query.role" clearable placeholder="全部角色" style="width: 140px">
            <el-option label="管理员" value="ADMIN" />
            <el-option label="销售员" value="SALES" />
            <el-option label="渠道员" value="CHANNEL" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input v-model="query.keyword" placeholder="姓名 / 账号" clearable @keyup.enter="load" />
        </el-form-item>
        <el-form-item v-if="userStore.isSystemAdmin">
          <el-button type="primary" @click="openEdit()">新增账号</el-button>
        </el-form-item>
      </el-form>
    </div>
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="name" label="姓名" min-width="100" />
      <el-table-column prop="username" label="账号" min-width="120" />
      <el-table-column prop="roleText" label="角色" width="100" />
      <el-table-column prop="projectNames" label="可访问项目" min-width="180" />
      <el-table-column prop="statusText" label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.disabled ? 'danger' : 'success'" size="small">
            {{ row.disabled ? "已禁用" : "正常" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="userStore.isSystemAdmin" label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="warning" @click="resetPwd(row)">重置密码</el-button>
          <el-button link :type="row.disabled ? 'success' : 'danger'" @click="toggle(row)">
            {{ row.disabled ? "启用" : "禁用" }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑账号' : '新增账号'" width="480px">
      <el-form :model="dialogForm" label-width="90px">
        <el-form-item label="姓名" required>
          <el-input v-model="dialogForm.name" />
        </el-form-item>
        <el-form-item label="账号" required>
          <el-input v-model="dialogForm.username" :disabled="!!editingId" />
        </el-form-item>
        <el-form-item v-if="!editingId" label="初始密码" required>
          <el-input v-model="dialogForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="dialogForm.role" style="width: 100%">
            <el-option label="管理员" value="ADMIN" />
            <el-option label="销售员" value="SALES" />
            <el-option label="渠道员" value="CHANNEL" />
          </el-select>
        </el-form-item>
        <el-form-item label="可访问项目">
          <el-select v-model="dialogForm.projectIds" multiple style="width: 100%">
            <el-option
              v-for="p in projectStore.projects"
              :key="p.projectId"
              :label="p.projectName"
              :value="p.projectId"
            />
          </el-select>
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
import { ElMessage, ElMessageBox } from "element-plus";
import request from "@/utils/request";
import { useUserStore } from "@/stores/user";
import { useProjectStore } from "@/stores/project";

const userStore = useUserStore();
const projectStore = useProjectStore();
const loading = ref(false);
const list = ref([]);
const query = reactive({ role: "", keyword: "" });
const dialogVisible = ref(false);
const editingId = ref("");
const dialogForm = reactive({
  name: "",
  username: "",
  password: "",
  role: "SALES",
  projectIds: [],
});

onMounted(load);

async function load() {
  loading.value = true;
  try {
    // TODO: 对接 GET /api/admin/users
  } finally {
    loading.value = false;
  }
}

function openEdit(row) {
  editingId.value = row?.id || "";
  Object.assign(dialogForm, {
    name: row?.name || "",
    username: row?.username || "",
    password: "",
    role: row?.role || "SALES",
    projectIds: row?.projectIds || [],
  });
  dialogVisible.value = true;
}

async function save() {
  // POST/PUT /api/admin/users（受 requireSystemAdmin 保护）
  if (editingId.value) {
    await request.put(`/admin/users/${editingId.value}`, dialogForm);
  } else {
    await request.post("/admin/users", dialogForm);
  }
  ElMessage.success("已保存");
  dialogVisible.value = false;
  load();
}

async function resetPwd(row) {
  const { value } = await ElMessageBox.prompt(
    `请输入账号「${row.name}」的新密码`,
    "重置密码",
    { inputType: "password", inputPattern: /^.{6,}$/, inputErrorMessage: "密码至少 6 位" }
  );
  // POST /api/admin/users/{id}/reset-password（受 requireSystemAdmin 保护）
  await request.post(`/admin/users/${row.id}/reset-password`, { password: value });
  ElMessage.success("密码已重置");
}

async function toggle(row) {
  await request.put(`/admin/users/${row.id}`, { disabled: !row.disabled });
  ElMessage.success(row.disabled ? "已启用" : "已禁用");
  load();
}
</script>
