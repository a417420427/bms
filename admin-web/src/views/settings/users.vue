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
            <el-option v-for="(text, key) in ROLE_TEXT" :key="key" :label="text" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-input v-model="query.keyword" placeholder="姓名 / 账号 / 手机号" clearable @keyup.enter="search" />
        </el-form-item>
        <el-form-item v-if="userStore.isSystemAdmin">
          <el-button type="primary" @click="openEdit()">新增账号</el-button>
        </el-form-item>
      </el-form>
    </div>
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column label="姓名" min-width="100">
        <template #default="{ row }">{{ row.realName || row.username || "-" }}</template>
      </el-table-column>
      <el-table-column prop="username" label="账号" min-width="120" />
      <el-table-column prop="phone" label="手机号" min-width="120">
        <template #default="{ row }">{{ row.phone || "-" }}</template>
      </el-table-column>
      <el-table-column label="角色" width="100">
        <template #default="{ row }">{{ ROLE_TEXT[row.role] || row.role || "-" }}</template>
      </el-table-column>
      <el-table-column label="可访问项目" min-width="180">
        <template #default="{ row }">
          {{ (row.accessibleProjects || []).map((p) => p.name).join("、") || "-" }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'DISABLED' ? 'danger' : 'success'" size="small">
            {{ row.status === "DISABLED" ? "已禁用" : "正常" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column v-if="userStore.isSystemAdmin" label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="warning" @click="resetPwd(row)">重置密码</el-button>
          <el-button
            link
            :type="row.status === 'DISABLED' ? 'success' : 'danger'"
            @click="toggle(row)"
          >
            {{ row.status === "DISABLED" ? "启用" : "禁用" }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑账号' : '新增账号'" width="480px">
      <el-form :model="dialogForm" label-width="90px">
        <el-form-item label="姓名" required>
          <el-input v-model="dialogForm.realName" />
        </el-form-item>
        <el-form-item label="账号" required>
          <el-input v-model="dialogForm.username" :disabled="!!editingId" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="dialogForm.phone" maxlength="11" />
        </el-form-item>
        <el-form-item v-if="!editingId" label="初始密码" required>
          <el-input v-model="dialogForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="dialogForm.role" style="width: 100%">
            <el-option v-for="(text, key) in ROLE_TEXT" :key="key" :label="text" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="可访问项目">
          <el-select v-model="dialogForm.projectIds" multiple style="width: 100%">
            <el-option v-for="p in projectOptions" :key="p._id" :label="p.name" :value="p._id" />
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

// 角色中文映射（与后端 ROLE 常量对齐）
const ROLE_TEXT = { ROLE_ADMIN: "管理员", ROLE_SALES: "销售员", ROLE_CHANNEL: "渠道员" };

const userStore = useUserStore();
const loading = ref(false);
const list = ref([]);
const projectOptions = ref([]);
const query = reactive({ role: "", keyword: "" });
const dialogVisible = ref(false);
const editingId = ref("");
const dialogForm = reactive({
  realName: "",
  username: "",
  phone: "",
  password: "",
  role: "ROLE_SALES",
  projectIds: [],
});

onMounted(() => {
  load();
  loadProjects();
});

async function load() {
  loading.value = true;
  try {
    // GET /api/admin/users → 用户全量列表（不分页）
    const data = await request.get("/admin/users", {
      params: {
        role: query.role || undefined,
        keyword: query.keyword || undefined,
      },
    });
    list.value = data || [];
  } catch {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadProjects() {
  // GET /api/admin/projects → 可访问项目下拉（实时加载，避免本地缓存滞后）
  try {
    projectOptions.value = (await request.get("/admin/projects")) || [];
  } catch {
    projectOptions.value = [];
  }
}

function search() {
  load();
}

function openEdit(row) {
  editingId.value = row?._id || row?.id || "";
  Object.assign(dialogForm, {
    realName: row?.realName || "",
    username: row?.username || "",
    phone: row?.phone || "",
    password: "",
    role: row?.role || "ROLE_SALES",
    projectIds: (row?.accessibleProjects || []).map((p) => p._id || p),
  });
  dialogVisible.value = true;
}

async function save() {
  if (!dialogForm.username.trim()) return ElMessage.warning("请输入账号");
  if (!editingId.value && !dialogForm.password) return ElMessage.warning("请输入初始密码");
  // POST/PUT /api/admin/users（受 requireSystemAdmin 保护）
  if (editingId.value) {
    await request.put(`/admin/users/${editingId.value}`, {
      realName: dialogForm.realName,
      phone: dialogForm.phone,
      role: dialogForm.role,
      accessibleProjects: dialogForm.projectIds,
    });
  } else {
    await request.post("/admin/users", {
      username: dialogForm.username,
      password: dialogForm.password,
      realName: dialogForm.realName,
      phone: dialogForm.phone,
      role: dialogForm.role,
      accessibleProjects: dialogForm.projectIds,
    });
  }
  ElMessage.success("已保存");
  dialogVisible.value = false;
  load();
}

async function resetPwd(row) {
  // POST /api/admin/users/:id/reset-password → 后端固定重置为默认密码
  const ok = await ElMessageBox.confirm(
    `确定将账号「${row.realName || row.username}」的密码重置为默认密码？`,
    "重置密码",
    { type: "warning" }
  ).catch(() => false);
  if (!ok) return;
  const res = await request.post(`/admin/users/${row._id || row.id}/reset-password`);
  ElMessage.success(res?.message || `密码已重置为 ${res?.defaultPassword || "123456"}`);
}

async function toggle(row) {
  // PUT /api/admin/users/:id → status: ACTIVE / DISABLED
  await request.put(`/admin/users/${row._id || row.id}`, {
    status: row.status === "DISABLED" ? "ACTIVE" : "DISABLED",
  });
  ElMessage.success(row.status === "DISABLED" ? "已启用" : "已禁用");
  load();
}
</script>
