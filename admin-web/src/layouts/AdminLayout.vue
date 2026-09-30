<template>
  <el-container class="admin-layout">
    <el-aside :width="isCollapse ? '64px' : '220px'" class="aside">
      <div class="logo">
        <span v-if="!isCollapse">商管营销宝</span>
        <span v-else>商</span>
      </div>
      <el-menu
        :default-active="$route.path"
        :collapse="isCollapse"
        :collapse-transition="false"
        router
        background-color="#001529"
        text-color="rgba(255,255,255,0.65)"
        active-text-color="#fff"
        class="menu"
      >
        <template v-for="item in menuItems">
          <!-- 看板分组 -->
          <el-sub-menu v-if="item.children" :key="item.path" index="boards">
            <template #title>
              <el-icon><DataBoard /></el-icon>
              <span>数据看板</span>
            </template>
            <el-menu-item
              v-for="child in item.children"
              :key="child.path"
              :index="child.path"
            >
              {{ child.title }}
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :key="item.path" :index="item.path">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Expand v-if="isCollapse" />
            <Fold v-else />
          </el-icon>
          <span class="page-title">{{ $route.meta.title }}</span>
        </div>
        <div class="header-right">
          <el-tag effect="plain" type="primary" class="project-tag">
            {{ projectStore.currentProject?.projectName || "未选择项目" }}
          </el-tag>
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              {{ userStore.userInfo?.realName || userStore.userInfo?.username || "管理员" }}
              <el-tag
                v-if="userStore.isSystemAdmin"
                size="small"
                type="warning"
                effect="dark"
                style="margin-left: 6px"
              >
                系统管理员
              </el-tag>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="switchProject">切换项目</el-dropdown-item>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>

    <!-- 登录后强制选择项目 -->
    <ProjectSelectDialog v-model="showProjectDialog" :mandatory="mandatory" />
  </el-container>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { useUserStore } from "@/stores/user";
import { useProjectStore } from "@/stores/project";
import ProjectSelectDialog from "@/components/ProjectSelectDialog.vue";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const projectStore = useProjectStore();

const isCollapse = ref(false);
const showProjectDialog = ref(false);
const mandatory = ref(false);

// 首次进入且未选项目 → 强制弹窗
watch(
  () => projectStore.needsSelect,
  (val) => {
    if (val) {
      mandatory.value = true;
      showProjectDialog.value = true;
    }
  },
  { immediate: true }
);

const menuItems = computed(() => {
  const children = router.options.routes.find((r) => r.path === "/").children;
  const items = [];
  const boardGroup = [];
  for (const r of children) {
    if (r.meta?.hidden) continue;
    if (r.meta?.systemAdminOnly && !userStore.isSystemAdmin) continue;
    const item = { path: `/${r.path}`, title: r.meta.title, icon: r.meta.icon };
    if (r.path.startsWith("boards/")) {
      boardGroup.push(item);
    } else {
      items.push(item);
    }
  }
  // 看板入口插在「数据导出」之后
  if (boardGroup.length) {
    const idx = items.findIndex((i) => i.path === "/export");
    items.splice(idx + 1, 0, { children: boardGroup });
  }
  // 系统设置分组仅系统管理员可见入口已在上方过滤
  return items;
});

function handleCommand(cmd) {
  if (cmd === "profile") {
    router.push("/profile");
  } else if (cmd === "switchProject") {
    mandatory.value = false;
    showProjectDialog.value = true;
  } else if (cmd === "logout") {
    ElMessageBox.confirm("确认退出登录吗？", "提示", { type: "warning" })
      .then(() => {
        userStore.logout();
        projectStore.clear();
        router.push("/login");
      })
      .catch(() => {});
  }
}
</script>

<style scoped>
.admin-layout {
  height: 100%;
}
.aside {
  background-color: #001529;
  transition: width 0.2s;
  overflow-x: hidden;
}
.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
.menu {
  border-right: none;
}
.header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.collapse-btn {
  font-size: 20px;
  cursor: pointer;
}
.page-title {
  font-size: 16px;
  font-weight: 500;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  gap: 4px;
}
.main {
  background: #f0f2f5;
  overflow-y: auto;
}
</style>
