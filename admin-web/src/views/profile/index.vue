<template>
  <el-row :gutter="16">
    <el-col :span="12">
      <el-card shadow="never">
        <template #header>个人信息</template>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="姓名">{{ userStore.userInfo?.realName || "-" }}</el-descriptions-item>
          <el-descriptions-item label="账号">{{ userStore.userInfo?.username || "-" }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            {{ userStore.isSystemAdmin ? "系统管理员" : "管理员" }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </el-col>

    <el-col :span="12">
      <el-card shadow="never" style="margin-bottom: 16px">
        <template #header>修改密码</template>
        <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="90px">
          <el-form-item label="原密码" prop="oldPassword">
            <el-input v-model="pwdForm.oldPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input v-model="pwdForm.newPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="确认密码" prop="confirm">
            <el-input v-model="pwdForm.confirm" type="password" show-password />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="changePwd">保存</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card shadow="never">
        <template #header>项目切换</template>
        <el-button type="primary" plain @click="showProjectDialog = true">切换项目</el-button>
      </el-card>
    </el-col>
  </el-row>

  <ProjectSelectDialog v-model="showProjectDialog" />
</template>

<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import request from "@/utils/request";
import { useUserStore } from "@/stores/user";
import { useProjectStore } from "@/stores/project";
import ProjectSelectDialog from "@/components/ProjectSelectDialog.vue";

const router = useRouter();
const userStore = useUserStore();
const projectStore = useProjectStore();

const showProjectDialog = ref(false);
const pwdFormRef = ref();
const pwdForm = reactive({ oldPassword: "", newPassword: "", confirm: "" });

const pwdRules = {
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
        val === pwdForm.newPassword ? cb() : cb(new Error("两次密码不一致")),
      trigger: "blur",
    },
  ],
};

async function changePwd() {
  await pwdFormRef.value.validate();
  // POST /api/auth/reset-password（登录态修改密码：oldPassword + newPassword）
  await request.post("/auth/reset-password", {
    oldPassword: pwdForm.oldPassword,
    newPassword: pwdForm.newPassword,
  });
  ElMessage.success("密码已修改，请重新登录");
  userStore.logout();
  projectStore.clear();
  router.push("/login");
}
</script>
