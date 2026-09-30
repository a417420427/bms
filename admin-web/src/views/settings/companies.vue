<template>
  <el-card shadow="never">
    <template #header>
      合作公司管理
      <el-text type="info" size="small" style="margin-left: 12px">维护渠道客户下拉选项</el-text>
    </template>
    <div v-if="userStore.isSystemAdmin" style="margin-bottom: 12px">
      <el-button type="primary" @click="openEdit()">新增公司</el-button>
    </div>
    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="name" label="公司名称" min-width="200" />
      <el-table-column prop="contact" label="联系人" width="110" />
      <el-table-column prop="phone" label="联系电话" width="140" />
      <el-table-column prop="createTime" label="创建时间" width="170" />
      <el-table-column v-if="userStore.isSystemAdmin" label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑公司' : '新增公司'" width="440px">
      <el-form :model="dialogForm" label-width="80px">
        <el-form-item label="公司名称" required>
          <el-input v-model="dialogForm.name" />
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="dialogForm.contact" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="dialogForm.phone" maxlength="11" />
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
const dialogForm = reactive({ name: "", contact: "", phone: "" });

onMounted(load);

async function load() {
  loading.value = true;
  try {
    // TODO: 对接 GET /api/admin/companies
  } finally {
    loading.value = false;
  }
}

function openEdit(row) {
  editingId.value = row?.id || "";
  Object.assign(dialogForm, { name: row?.name || "", contact: row?.contact || "", phone: row?.phone || "" });
  dialogVisible.value = true;
}

async function save() {
  if (!dialogForm.name.trim()) return ElMessage.warning("请输入公司名称");
  // POST/PUT /api/admin/companies（受 requireSystemAdmin 保护）
  if (editingId.value) {
    await request.put(`/admin/companies/${editingId.value}`, dialogForm);
  } else {
    await request.post("/admin/companies", dialogForm);
  }
  ElMessage.success("已保存");
  dialogVisible.value = false;
  load();
}
</script>
