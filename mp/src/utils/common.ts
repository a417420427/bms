// 通用工具
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
