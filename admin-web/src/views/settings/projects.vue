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
      <el-table-column prop="name" label="项目名称" min-width="160" />
      <el-table-column prop="code" label="项目编码" min-width="120">
        <template #default="{ row }">{{ row.code || "-" }}</template>
      </el-table-column>
      <el-table-column prop="developer" label="开发商" min-width="140">
        <template #default="{ row }">{{ row.developer || "-" }}</template>
      </el-table-column>
      <el-table-column prop="address" label="地址" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ row.address || "-" }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'DISABLED' ? 'danger' : 'success'" size="small">
            {{ row.status === "DISABLED" ? "已停用" : "启用中" }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column v-if="userStore.isSystemAdmin" label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button
            link
            :type="row.status === 'DISABLED' ? 'success' : 'danger'"
            @click="toggle(row)"
          >
            {{ row.status === "DISABLED" ? "启用" : "停用" }}
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑项目' : '新增项目'" width="460px">
      <el-form :model="dialogForm" label-width="80px">
        <el-form-item label="项目名称" required>
          <el-input v-model="dialogForm.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目编码">
          <el-input v-model="dialogForm.code" placeholder="选填，不填默认同项目名称" />
        </el-form-item>
        <el-form-item label="开发商">
          <el-input v-model="dialogForm.developer" placeholder="选填" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="dialogForm.address" placeholder="选填" />
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

function fmtTime(t) {
  return t ? new Date(t).toLocaleString("zh-CN", { hour12: false }) : "-";
}

const userStore = useUserStore();
const loading = ref(false);
const list = ref([]);
const dialogVisible = ref(false);
const editingId = ref("");
const dialogForm = reactive({ name: "", code: "", developer: "", address: "" });

onMounted(load);

async function load() {
  loading.value = true;
  try {
    // GET /api/admin/projects → 项目全量列表
    list.value = (await request.get("/admin/projects")) || [];
  } catch {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

function openEdit(row) {
  editingId.value = row?._id || "";
  Object.assign(dialogForm, {
    name: row?.name || "",
    code: row?.code || "",
    developer: row?.developer || "",
    address: row?.address || "",
  });
  dialogVisible.value = true;
}

async function save() {
  if (!dialogForm.name.trim()) return ElMessage.warning("请输入项目名称");
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
  // PUT /api/admin/projects/:id → status: ACTIVE / DISABLED
  await request.put(`/admin/projects/${row._id}`, {
    status: row.status === "DISABLED" ? "ACTIVE" : "DISABLED",
  });
  ElMessage.success(row.status === "DISABLED" ? "已启用" : "已停用");
  load();
}
</script>
