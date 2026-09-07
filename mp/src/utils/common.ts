// 通用工具
import Taro from "@tarojs/taro";
import { ROLE } from "./constants";

export const ROLE_LABELS: Record<string, string> = {
  [ROLE.ROLE_SALES]: "销售员",
  [ROLE.ROLE_CHANNEL]: "渠道员",
  [ROLE.ROLE_ADMIN]: "管理员",
};

/** 手机号脱敏（前三后四） */
export const maskPhone = (phone: string): string => {
  if (!phone || phone.length !== 11) return phone || "";
  return phone.slice(0, 3) + "****" + phone.slice(7);
};

/** 校验 11 位手机号 */
export const isValidPhone = (phone: string): boolean => {
  return /^1[3-9]\d{9}$/.test(phone || "");
};

/** 倒计时格式化（基于剩余毫秒） */
export const formatCountdown = (ms: number): string => {
  if (ms <= 0) return "已过期";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${m}m ${s}s`;
};

/** 简单深拷贝 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== "object") return obj;
  return JSON.parse(JSON.stringify(obj));
};

/** 防抖 */
export const debounce = <T extends (...args: any[]) => any>(fn: T, delay = 300) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// tabBar 页面路径（与 app.config.ts tabBar.list 对齐）
// navigateTo 不能跳 tabBar 页，必须用 switchTab
export const TAB_BAR_PAGES = [
  "pages/sales/dashboard/index",
  "pages/sales/customerList/index",
  "pages/channel/dashboard/index",
  "pages/channel/customerList/index",
  "pages/admin/dashboard/index",
  "pages/admin/customerList/index",
  "pages/admin/unvisitedApproval/index",
  "pages/mine/index",
];

/**
 * 统一路由跳转：tabBar 页用 switchTab，其余用 navigateTo
 * 用法：go("/pages/sales/customerList/index") 或 go("/pages/sales/customerCreate/index?id=1")
 */
export const go = (url: string) => {
  const path = url.replace(/^\//, "").split("?")[0];
  if (TAB_BAR_PAGES.includes(path)) {
    Taro.switchTab({ url });
  } else {
    Taro.navigateTo({ url });
  }
};
