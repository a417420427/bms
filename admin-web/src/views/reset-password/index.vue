<template>
  <div class="reset-page">
    <el-card class="reset-card">
      <h2 class="title">修改密码</h2>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px" size="large">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="form.oldPassword" type="password" show-password placeholder="请输入原密码" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="form.newPassword" type="password" show-password placeholder="至少 8 位且包含字母和数字" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm">
          <el-input v-model="form.confirm" type="password" show-password placeholder="请再次输入新密码" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" @click="handleChange">确认修改</el-button>
          <el-button @click="$router.push('/login')">返回登录</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { useRouter } from "vue-router";
import request from "@/utils/request";
import { useUserStore } from "@/stores/user";
import { useProjectStore } from "@/stores/project";

const router = useRouter();
const userStore = useUserStore();
const projectStore = useProjectStore();

const formRef = ref();
const loading = ref(false);
const form = reactive({ oldPassword: "", newPassword: "", confirm: "" });

const rules = {
  oldPassword: [{ required: true, message: "请输入原密码", trigger: "blur" }],
  newPassword: [
    { required: true, message: "请输入新密码", trigger: "blur" },
    {
      pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/,
      message: "密码至少 8 位且包含字母和数字",
      trigger: "blur",
    },
  ],
  confirm: [
    {
      validator: (_, val, cb) =>
        val === form.newPassword ? cb() : cb(new Error("两次密码不一致")),
      trigger: "blur",
    },
  ],
};

async function handleChange() {
  await formRef.value.validate();
  loading.value = true;
  try {
    // POST /api/auth/reset-password（需登录态）
    await request.post("/auth/reset-password", {
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
    });
    ElMessage.success("密码已修改，请重新登录");
    userStore.logout();
    projectStore.clear();
    router.push("/login");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.reset-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1f3a5f 0%, #2b5c8a 100%);
}
.reset-card {
  width: 440px;
  padding: 8px 16px 4px;
}
.title {
  text-align: center;
  margin-bottom: 24px;
  color: #303133;
}
</style>
