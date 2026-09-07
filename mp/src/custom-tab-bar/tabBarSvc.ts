// 根据角色获取 tab bar 列表
import { ROLE } from "@/utils/constants";

export interface TabItem {
  pagePath: string;
  text: string;
  iconPath: string;
  selectedIconPath: string;
}

const COMMON_TABS: TabItem[] = [
  {
    pagePath: "/pages/mine/index",
    text: "我的",
    iconPath: "assets/icons/mine.png",
    selectedIconPath: "assets/icons/mine-active.png",
  },
];

const SALES_TABS: TabItem[] = [
  {
    pagePath: "/pages/sales/dashboard/index",
    text: "工作台",
    iconPath: "assets/icons/dashboard.png",
    selectedIconPath: "assets/icons/dashboard-active.png",
  },
  {
    pagePath: "/pages/sales/customerList/index",
    text: "客户",
    iconPath: "assets/icons/customer.png",
    selectedIconPath: "assets/icons/customer-active.png",
  },
  ...COMMON_TABS,
];

const CHANNEL_TABS: TabItem[] = [
  {
    pagePath: "/pages/channel/dashboard/index",
    text: "工作台",
    iconPath: "assets/icons/dashboard.png",
    selectedIconPath: "assets/icons/dashboard-active.png",
  },
  {
    pagePath: "/pages/channel/customerList/index",
    text: "推荐",
    iconPath: "assets/icons/customer.png",
    selectedIconPath: "assets/icons/customer-active.png",
  },
  ...COMMON_TABS,
];

const ADMIN_TABS: TabItem[] = [
  {
    pagePath: "/pages/admin/dashboard/index",
    text: "总览",
    iconPath: "assets/icons/dashboard.png",
    selectedIconPath: "assets/icons/dashboard-active.png",
  },
  {
    pagePath: "/pages/admin/customerList/index",
    text: "客户",
    iconPath: "assets/icons/customer.png",
    selectedIconPath: "assets/icons/customer-active.png",
  },
  {
    pagePath: "/pages/admin/unvisitedApproval/index",
    text: "审批",
    iconPath: "assets/icons/approval.png",
    selectedIconPath: "assets/icons/approval-active.png",
  },
  ...COMMON_TABS,
];

export function getBarList(role: RoleType): TabItem[] {
  switch (role) {
    case ROLE.ROLE_SALES:
      return SALES_TABS;
    case ROLE.ROLE_CHANNEL:
      return CHANNEL_TABS;
    case ROLE.ROLE_ADMIN:
      return ADMIN_TABS;
    default:
      return COMMON_TABS;
  }
}
