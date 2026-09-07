// 根据角色获取 tab bar 列表
import { ROLE } from "@/utils/constants";
import tuanti from "@/assets/icons/tuanti.png";
import yonghu from "@/assets/icons/yonghu.png";
import shenhe from "@/assets/icons/shenhe.png";
import qingdan from "@/assets/icons/qingdan.png";
import yonghuActive from "@/assets/icons/yonghu-active.png";
import shenheActive from "@/assets/icons/shenhe-active.png";
import qingdanActive from "@/assets/icons/qingdan-active.png";
import tuantiActive from "@/assets/icons/tuanti-active.png";



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
    iconPath: yonghu,
    selectedIconPath: yonghuActive,
  },
];

const SALES_TABS: TabItem[] = [
  {
    pagePath: "/pages/sales/dashboard/index",
    text: "工作台",
    iconPath: qingdan,
    selectedIconPath: qingdanActive,
  },
  {
    pagePath: "/pages/sales/customerList/index",
    text: "客户",
    iconPath: tuanti,
    selectedIconPath: tuantiActive,
  },
  ...COMMON_TABS,
];

const CHANNEL_TABS: TabItem[] = [
  {
    pagePath: "/pages/channel/dashboard/index",
    text: "工作台",
    iconPath: qingdan,
    selectedIconPath: qingdanActive,
  },
  {
    pagePath: "/pages/channel/customerList/index",
    text: "推荐",
    iconPath: tuanti,
    selectedIconPath: tuantiActive,
  },
  ...COMMON_TABS,
];

const ADMIN_TABS: TabItem[] = [
  {
    pagePath: "/pages/admin/dashboard/index",
    text: "总览",
    iconPath: qingdan,
    selectedIconPath: qingdanActive,
  },
  {
    pagePath: "/pages/admin/customerList/index",
    text: "客户",
    iconPath: tuanti,
    selectedIconPath: tuantiActive,
  },
  {
    pagePath: "/pages/admin/unvisitedApproval/index",
    text: "审批",
    iconPath: shenhe,
    selectedIconPath: shenheActive,
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
