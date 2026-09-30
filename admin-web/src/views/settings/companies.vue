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
      <el-table-column label="所属项目" min-width="140">
        <template #default="{ row }">{{ row.projectName || row.projectId?.name || "-" }}</template>
      </el-table-column>
      <el-table-column label="联系人" width="110">
        <template #default="{ row }">{{ row.contactName || "-" }}</template>
      </el-table-column>
      <el-table-column label="联系电话" width="140">
        <template #default="{ row }">{{ row.contactPhone || "-" }}</template>
      </el-table-column>
      <el-table-column label="地址" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.address || "-" }}</template>
      </el-table-column>
      <el-table-column label="创建时间" width="170">
        <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column v-if="userStore.isSystemAdmin" label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-empty v-if="!loading && !list.length" description="暂无合作公司" />

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑公司' : '新增公司'" width="460px">
      <el-form :model="dialogForm" label-width="80px">
        <el-form-item label="公司名称" required>
          <el-input v-model="dialogForm.name" />
        </el-form-item>
        <el-form-item label="所属项目" :required="!editingId">
          <el-select
            v-model="dialogForm.projectId"
            :disabled="!!editingId"
            placeholder="请选择项目"
            style="width: 100%"
          >
            <el-option v-for="p in projectOptions" :key="p._id" :label="p.name" :value="p._id" />
          </el-select>
        </el-form-item>
        <el-form-item label="联系人">
          <el-input v-model="dialogForm.contactName" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="dialogForm.contactPhone" maxlength="11" />
        </el-form-item>
        <el-form-item label="地址">
          <el-input v-model="dialogForm.address" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="dialogForm.remark" type="textarea" :rows="2" />
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
const projectOptions = ref([]);
const dialogVisible = ref(false);
const editingId = ref("");
const dialogForm = reactive({
  name: "",
  projectId: "",
  contactName: "",
  contactPhone: "",
  address: "",
  remark: "",
});

onMounted(() => {
  load();
  loadProjects();
});

async function load() {
  loading.value = true;
  try {
    // GET /api/admin/companies → 全量合作公司（含 projectName）
    list.value = (await request.get("/admin/companies")) || [];
  } catch {
    list.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadProjects() {
  // GET /api/admin/projects → 所属项目下拉（实时加载）
  try {
    projectOptions.value = (await request.get("/admin/projects")) || [];
  } catch {
    projectOptions.value = [];
  }
}

function openEdit(row) {
  editingId.value = row?._id || "";
  Object.assign(dialogForm, {
    name: row?.name || "",
    projectId: row?.projectId?._id || row?.projectId || "",
    contactName: row?.contactName || "",
    contactPhone: row?.contactPhone || "",
    address: row?.address || "",
    remark: row?.remark || "",
  });
  dialogVisible.value = true;
}

async function save() {
  if (!dialogForm.name.trim()) return ElMessage.warning("请输入公司名称");
  if (!editingId.value && !dialogForm.projectId) return ElMessage.warning("请选择所属项目");
  // POST/PUT /api/admin/companies（受 requireSystemAdmin 保护）
  if (editingId.value) {
    await request.put(`/admin/companies/${editingId.value}`, {
      name: dialogForm.name,
      contactName: dialogForm.contactName,
      contactPhone: dialogForm.contactPhone,
      address: dialogForm.address,
      remark: dialogForm.remark,
    });
  } else {
    await request.post("/admin/companies", {
      name: dialogForm.name,
      projectId: dialogForm.projectId,
      contactName: dialogForm.contactName,
      contactPhone: dialogForm.contactPhone,
      address: dialogForm.address,
      remark: dialogForm.remark,
    });
  }
  ElMessage.success("已保存");
  dialogVisible.value = false;
  load();
}
</script>
