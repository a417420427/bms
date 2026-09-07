export default defineAppConfig({
  pages: [
    // V6/O3: 启动路由守卫页作为 pages[0]，避免非 sales 角色启动时误触发 sales/dashboard 请求导致 403
    "pages/launch/index",
    // 销售
    "pages/sales/dashboard/index",
    // 公共
    "pages/authPage/index",
    "pages/projectSelect/index",
    "pages/sales/customerCreate/index",
    "pages/sales/customerList/index",
    "pages/sales/customerDetail/index",
    "pages/sales/publicPool/index",
    "pages/sales/unvisitedPool/index",
    "pages/sales/reminder/index",
    // 渠道
    "pages/channel/dashboard/index",
    "pages/channel/customerCreate/index",
    "pages/channel/customerList/index",
    "pages/channel/customerDetail/index",
    "pages/channel/expiredPool/index",
    // 管理员
    "pages/admin/dashboard/index",
    "pages/admin/customerCreate/index",
    "pages/admin/customerList/index",
    "pages/admin/customerDetail/index",
    "pages/admin/publicPool/index",
    "pages/admin/unvisitedApproval/index",
    "pages/admin/expiredPool/index",
    "pages/admin/export/index",
    "pages/admin/project/index",
    "pages/admin/user/index",
    "pages/admin/company/index",
    "pages/admin/config/index",
    "pages/admin/auditLog/index",
    // 个人中心
    "pages/mine/index",
  ],
  window: {
    backgroundTextStyle: "light",
    navigationBarBackgroundColor: "#fff",
    navigationBarTitleText: "商管营销宝",
    navigationBarTextStyle: "black",
  },
  tabBar: {
    custom: true,
    color: "#999",
    selectedColor: "#1677ff",
    backgroundColor: "#fff",
    list: [
      { pagePath: "pages/sales/dashboard/index", text: "工作台" },
      { pagePath: "pages/sales/customerList/index", text: "客户" },
      { pagePath: "pages/channel/dashboard/index", text: "工作台" },
      { pagePath: "pages/channel/customerList/index", text: "推荐" },
      { pagePath: "pages/admin/dashboard/index", text: "总览" },
      { pagePath: "pages/admin/customerList/index", text: "客户" },
      { pagePath: "pages/admin/unvisitedApproval/index", text: "审批" },
      { pagePath: "pages/mine/index", text: "我的" },
    ],
  },
});
