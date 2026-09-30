<template>
  <el-card shadow="never">
    <template #header>新增客户录入（管理员表单）</template>
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="120px"
      style="max-width: 640px"
    >
      <el-form-item label="客户姓名" prop="name">
        <el-input v-model="form.name" placeholder="请输入客户姓名" />
      </el-form-item>
      <el-form-item label="手机号" prop="phone">
        <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" @blur="checkDuplicate" />
      </el-form-item>
      <el-form-item label="年龄">
        <el-input-number v-model="form.age" :min="1" :max="120" />
      </el-form-item>
      <el-form-item label="到访渠道" prop="source">
        <el-select v-model="form.source" placeholder="请选择（管理员可选全部）" @change="form.companyId = ''; form.referrerName = ''">
          <el-option label="自访" value="SELF_VISIT" />
          <el-option label="自拓" value="SELF_DEVELOP" />
          <el-option label="渠道公司推荐" value="CHANNEL_COMPANY" />
          <el-option label="个人推荐" value="PERSONAL_REFERRAL" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="form.source === 'CHANNEL_COMPANY'" label="合作公司" prop="companyId">
        <el-select v-model="form.companyId" placeholder="请选择合作公司" style="width: 100%">
          <el-option v-for="c in companies" :key="c._id" :label="c.name" :value="c._id" />
        </el-select>
      </el-form-item>
      <el-form-item v-if="form.source === 'PERSONAL_REFERRAL'" label="推荐人姓名" prop="referrerName">
        <el-input v-model="form.referrerName" placeholder="请输入推荐人姓名" />
      </el-form-item>
      <el-form-item label="预计到访时间" prop="visitTime">
        <el-date-picker
          v-model="form.visitTime"
          type="datetime"
          placeholder="选择日期时间"
          value-format="YYYY-MM-DD HH:mm:ss"
        />
      </el-form-item>
      <el-form-item label="意向评级" prop="intentLevel">
        <el-select v-model="form.intentLevel" placeholder="请选择">
          <el-option label="高意向" value="HIGH" />
          <el-option label="中意向" value="MEDIUM" />
          <el-option label="低意向" value="LOW" />
          <el-option label="无意向" value="NONE" />
        </el-select>
      </el-form-item>
      <el-form-item label="归属销售员">
        <el-select v-model="form.ownerId" clearable filterable placeholder="可选，指定归属销售员" style="width: 100%">
          <el-option v-for="s in salesmen" :key="s._id" :label="s.realName || s.username" :value="s._id" />
        </el-select>
      </el-form-item>
      <el-form-item label="水印照片">
        <!-- 图片上传自动加水印（项目名 + 时间），走通用上传接口后回填 URL -->
        <el-input v-model="form.visitPhotos" placeholder="多张以英文逗号分隔（上传组件对接后自动回填）" />
      </el-form-item>
      <el-form-item label="备注">
        <el-input v-model="form.remark" type="textarea" :rows="3" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">提交</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import request from "@/utils/request";

const formRef = ref();
const submitting = ref(false);
const companies = ref([]);
const salesmen = ref([]);

const form = reactive({
  name: "",
  phone: "",
  age: undefined,
  source: "",
  companyId: "",
  referrerName: "",
  visitTime: "",
  intentLevel: "",
  ownerId: "",
  visitPhotos: "",
  remark: "",
});

const rules = {
  name: [{ required: true, message: "请输入客户姓名", trigger: "blur" }],
  phone: [
    { required: true, message: "请输入手机号", trigger: "blur" },
    { pattern: /^1\d{10}$/, message: "手机号格式不正确", trigger: "blur" },
  ],
  source: [{ required: true, message: "请选择到访渠道", trigger: "change" }],
  visitTime: [{ required: true, message: "请选择预计到访时间", trigger: "change" }],
  intentLevel: [{ required: true, message: "请选择意向评级", trigger: "change" }],
};

onMounted(async () => {
  // GET /api/admin/companies（渠道公司下拉）
  try {
    const data = await request.get("/admin/companies", { params: { pageSize: 100 } });
    companies.value = data.list || data || [];
  } catch {
    companies.value = [];
  }
  // GET /api/admin/users?role=ROLE_SALES（归属销售员下拉）
  try {
    const data = await request.get("/admin/users", { params: { role: "ROLE_SALES", pageSize: 100 } });
    salesmen.value = data.list || data || [];
  } catch {
    salesmen.value = [];
  }
});

// 防抖查重：POST /api/sales/customer/check-duplicate → { duplicated }
let dupTimer = null;
function checkDuplicate() {
  clearTimeout(dupTimer);
  if (!/^1\d{10}$/.test(form.phone)) return;
  dupTimer = setTimeout(async () => {
    try {
      const res = await request.post("/sales/customer/check-duplicate", { phone: form.phone });
      if (res?.duplicated) {
        ElMessage.warning("该手机号已存在，提交将走冲突审批流程");
      }
    } catch {
      // 查重失败不阻断录入（后端提交时还会强制查重）
    }
  }, 400);
}

async function handleSubmit() {
  await formRef.value.validate();
  submitting.value = true;
  try {
    // 前端辅助校验：预计到访时间不能晚于系统时间 4 小时以上（后端强制）
    if (form.visitTime && new Date(form.visitTime).getTime() - Date.now() > 4 * 3600 * 1000) {
      ElMessage.error("预计到访时间不能晚于当前时间 4 小时以上");
      return;
    }
    // POST /api/admin/customer
    await request.post("/admin/customer", {
      name: form.name,
      phone: form.phone,
      age: form.age,
      source: form.source,
      intentLevel: form.intentLevel,
      visitTime: form.visitTime,
      companyId: form.companyId || undefined,
      referrerName: form.referrerName || undefined,
      ownerId: form.ownerId || undefined,
      visitPhotos: form.visitPhotos
        ? form.visitPhotos.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      remark: form.remark,
    });
    ElMessage.success("客户已录入");
    formRef.value.resetFields();
  } finally {
    submitting.value = false;
  }
}
</script>
