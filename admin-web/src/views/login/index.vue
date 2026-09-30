<template>
  <div class="login-page">
    <el-card class="login-card">
      <h2 class="title">商管营销宝 · 管理端</h2>
      <el-form ref="formRef" :model="form" :rules="rules" size="large" @keyup.enter="handleLogin">
        <el-form-item prop="username">
          <el-input v-model="form.username" placeholder="请输入账号" :prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            show-password
            :prefix-icon="Lock"
          />
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="form.remember">记住账号</el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            style="width: 100%"
            :loading="loading"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>
        <div class="links">
          <router-link to="/reset-password">修改密码？</router-link>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { User, Lock } from "@element-plus/icons-vue";
import { loginApi } from "@/api/auth";
import { useUserStore } from "@/stores/user";
import { useProjectStore } from "@/stores/project";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const projectStore = useProjectStore();

const formRef = ref();
const loading = ref(false);
const form = reactive({
  username: localStorage.getItem("rememberedUsername") || "",
  password: "",
  remember: !!localStorage.getItem("rememberedUsername"),
});

const rules = {
  username: [{ required: true, message: "请输入账号", trigger: "blur" }],
  password: [{ required: true, message: "请输入密码", trigger: "blur" }],
};

onMounted(() => {
  // 登录页预取项目列表会导致项目弹窗数据为空，此处仅清理旧项目上下文
  projectStore.clear();
});

async function handleLogin() {
  await formRef.value.validate();
  loading.value = true;
  try {
    // POST /api/auth/login → { token, user }
    const data = await loginApi({
      username: form.username.trim(),
      password: form.password,
    });
    if (form.remember) {
      localStorage.setItem("rememberedUsername", form.username.trim());
    } else {
      localStorage.removeItem("rememberedUsername");
    }
    userStore.setLogin(data);
    ElMessage.success("登录成功");
    router.push(route.query.redirect || "/dashboard");
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1f3a5f 0%, #2b5c8a 100%);
}
.login-card {
  width: 400px;
  padding: 8px 16px 4px;
}
.title {
  text-align: center;
  margin-bottom: 24px;
  color: #303133;
}
.links {
  text-align: right;
}
.links a {
  color: #409eff;
  font-size: 13px;
  text-decoration: none;
}
</style>
