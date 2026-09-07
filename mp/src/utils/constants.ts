// 全局常量
export const ROLE = {
  ROLE_SALES: "ROLE_SALES",
  ROLE_CHANNEL: "ROLE_CHANNEL",
  ROLE_ADMIN: "ROLE_ADMIN",
} as const;

export const CUSTOMER_SOURCE = {
  SELF_VISIT: "SELF_VISIT",
  SELF_DEVELOP: "SELF_DEVELOP",
  CHANNEL_COMPANY: "CHANNEL_COMPANY",
  PERSONAL_REFERRAL: "PERSONAL_REFERRAL",
} as const;

export const SOURCE_LABELS: Record<string, string> = {
  SELF_VISIT: "自访",
  SELF_DEVELOP: "自拓",
  CHANNEL_COMPANY: "渠道公司推荐",
  PERSONAL_REFERRAL: "个人推荐",
};

export const INTENT_LABELS: Record<string, string> = {
  HIGH: "高",
  MEDIUM: "中",
  LOW: "低",
  NONE: "无意向",
};

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "正常跟进",
  DEAL: "已成交",
  PUBLIC_POOL: "公共池",
  EXPIRED: "已过期",
  UNVISITED: "未到访",
};

export const FOLLOWUP_METHOD_LABELS: Record<string, string> = {
  PHONE: "电话",
  WECHAT: "微信",
  FACE: "面谈",
};

export const APPROVAL_TYPE_LABELS: Record<string, string> = {
  CUSTOMER_CONFLICT: "客户冲突录入",
  CLAIM_PUBLIC: "公共池认领",
  CLAIM_UNVISITED: "未到访申领",
};

export const APPROVAL_RESULT_LABELS: Record<string, string> = {
  PENDING: "待审批",
  APPROVED: "已同意",
  REJECTED: "已驳回",
};

// 默认 tab 路径（按角色）
export const ROLE_HOME: Record<string, string> = {
  ROLE_SALES: "/pages/sales/dashboard/index",
  ROLE_CHANNEL: "/pages/channel/dashboard/index",
  ROLE_ADMIN: "/pages/admin/dashboard/index",
};
