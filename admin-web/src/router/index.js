import { createRouter, createWebHistory } from "vue-router";
import { useUserStore } from "@/stores/user";
import { useProjectStore } from "@/stores/project";

const routes = [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/login/index.vue"),
    meta: { title: "登录", public: true },
  },
  {
    path: "/reset-password",
    name: "ResetPassword",
    component: () => import("@/views/reset-password/index.vue"),
    meta: { title: "修改密码", public: true },
  },
  {
    path: "/",
    component: () => import("@/layouts/AdminLayout.vue"),
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        name: "Dashboard",
        component: () => import("@/views/dashboard/index.vue"),
        meta: { title: "工作台首页", icon: "Odometer" },
      },
      {
        path: "customer/create",
        name: "CustomerCreate",
        component: () => import("@/views/customer/create.vue"),
        meta: { title: "新增客户录入", icon: "Plus" },
      },
      {
        path: "customers",
        name: "CustomerList",
        component: () => import("@/views/customer/list.vue"),
        meta: { title: "全部客户管理", icon: "User" },
      },
      {
        path: "customers/:id",
        name: "CustomerDetail",
        component: () => import("@/views/customer/detail.vue"),
        meta: { title: "客户详情", hidden: true },
      },
      {
        path: "public-pool",
        name: "PublicPool",
        component: () => import("@/views/public-pool/index.vue"),
        meta: { title: "公共池管理", icon: "Box" },
      },
      {
        path: "unvisited-approvals",
        name: "UnvisitedApprovals",
        component: () => import("@/views/unvisited-approvals/index.vue"),
        meta: { title: "未到访申领审批", icon: "Stamp" },
      },
      {
        path: "expired-pool",
        name: "ExpiredPool",
        component: () => import("@/views/expired-pool/index.vue"),
        meta: { title: "过期池管理", icon: "Timer" },
      },
      {
        path: "export",
        name: "DataExport",
        component: () => import("@/views/export/index.vue"),
        meta: { title: "数据导出", icon: "Download" },
      },
      {
        path: "audit-logs",
        name: "AuditLogs",
        component: () => import("@/views/audit-logs/index.vue"),
        meta: { title: "操作日志", icon: "Document" },
      },
      {
        path: "boards/funnel",
        name: "BoardFunnel",
        component: () => import("@/views/boards/funnel.vue"),
        meta: { title: "客户漏斗看板", icon: "Filter" },
      },
      {
        path: "boards/sales",
        name: "BoardSales",
        component: () => import("@/views/boards/sales.vue"),
        meta: { title: "销售业绩看板", icon: "TrophyBase", hidden: true },
      },
      {
        path: "boards/channel",
        name: "BoardChannel",
        component: () => import("@/views/boards/channel.vue"),
        meta: { title: "渠道贡献看板", hidden: true },
      },
      {
        path: "boards/warning",
        name: "BoardWarning",
        component: () => import("@/views/boards/warning.vue"),
        meta: { title: "跟进预警看板", hidden: true },
      },
      {
        path: "boards/activity",
        name: "BoardActivity",
        component: () => import("@/views/boards/activity.vue"),
        meta: { title: "实时动态看板", hidden: true },
      },
      {
        path: "settings/projects",
        name: "SettingsProjects",
        component: () => import("@/views/settings/projects.vue"),
        meta: { title: "项目管理", icon: "OfficeBuilding", systemAdminOnly: true },
      },
      {
        path: "settings/users",
        name: "SettingsUsers",
        component: () => import("@/views/settings/users.vue"),
        meta: { title: "账号角色管理", icon: "UserFilled", systemAdminOnly: true },
      },
      {
        path: "settings/companies",
        name: "SettingsCompanies",
        component: () => import("@/views/settings/companies.vue"),
        meta: { title: "合作公司管理", icon: "Shop", systemAdminOnly: true },
      },
      {
        path: "settings/config",
        name: "SettingsConfig",
        component: () => import("@/views/settings/config.vue"),
        meta: { title: "系统参数配置", icon: "Setting" },
      },
      {
        path: "profile",
        name: "Profile",
        component: () => import("@/views/profile/index.vue"),
        meta: { title: "个人中心", hidden: true },
      },
    ],
  },
  { path: "/:pathMatch(.*)*", redirect: "/dashboard" },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} - 商管营销宝` : "商管营销宝";
  const userStore = useUserStore();
  if (to.meta.public) {
    if (to.name === "Login" && userStore.isLoggedIn) return "/dashboard";
    return true;
  }
  if (!userStore.isLoggedIn) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  // 系统管理员专属页面
  if (to.meta.systemAdminOnly && !userStore.isSystemAdmin) {
    return "/dashboard";
  }
  // 登录后强制先选项目（项目选择弹窗在布局内处理）
  const projectStore = useProjectStore();
  if (projectStore.needsSelect && to.name !== "Profile") {
    return true; // 由 AdminLayout 中的 ProjectSelectDialog 拦截
  }
  return true;
});

export default router;
