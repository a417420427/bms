// 全局业务类型定义
// 使用 declare global 让所有类型无需 import 即可在项目中使用

export {};

declare global {
  type RoleType = "ROLE_SALES" | "ROLE_CHANNEL" | "ROLE_ADMIN";

  type IntentLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";

  type CustomerSource =
    | "SELF_VISIT"
    | "SELF_DEVELOP"
    | "CHANNEL_COMPANY"
    | "PERSONAL_REFERRAL";

  type CustomerStatus =
    | "ACTIVE"
    | "DEAL"
    | "PUBLIC_POOL"
    | "EXPIRED"
    | "UNVISITED";

  type FollowupMethod = "PHONE" | "WECHAT" | "FACE";

  type ApprovalType =
    | "CUSTOMER_CONFLICT"
    | "CLAIM_PUBLIC"
    | "CLAIM_UNVISITED";

  type ApprovalResult = "PENDING" | "APPROVED" | "REJECTED";

  interface ProjectItem {
    _id: string;
    name: string;
    code?: string;
    address?: string;
    developer?: string;
    [key: string]: any;
  }

  interface UserInfoProp {
    id: string;
    _id?: string;
    username: string;
    realName: string;
    role: RoleType;
    phone: string;
    avatar?: string;
    // 0907: 系统管理员标识（唯一账号拥有全部权限）
    isSystemAdmin?: boolean;
    currentProject: ProjectItem | null;
    accessibleProjects: ProjectItem[];
    [key: string]: any;
  }

  interface CustomerItem {
    _id: string;
    name: string;
    phone: string;
    source: CustomerSource;
    intentLevel: IntentLevel;
    status: CustomerStatus;
    visitTime?: string;
    visitPhotos?: string[];
    lastFollowupAt?: string;
    projectId?: string;
    projectName?: string;
    owner?: {
      _id: string;
      realName?: string;
      username?: string;
      phone?: string;
    };
    channelUser?: {
      _id: string;
      realName?: string;
      username?: string;
    };
    company?: {
      _id: string;
      name: string;
    };
    remark?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: any;
  }

  interface FollowupItem {
    _id: string;
    customerId: string;
    method: FollowupMethod;
    content: string;
    result?: string;
    followupTime: string;
    operator?: {
      _id: string;
      realName?: string;
    };
    photos?: string[];
    [key: string]: any;
  }

  interface ApprovalItem {
    _id: string;
    type: ApprovalType;
    result: ApprovalResult;
    remark?: string;
    applicant?: {
      _id: string;
      realName?: string;
      username?: string;
    };
    customer?: CustomerItem;
    customerId?: string;
    createdAt?: string;
    handledAt?: string;
    handler?: {
      _id: string;
      realName?: string;
    };
    [key: string]: any;
  }

  interface PublicPoolItem {
    _id: string;
    customer: CustomerItem;
    customerId: string;
    reason?: string;
    releasedAt?: string;
    [key: string]: any;
  }

  interface ExpiredPoolItem {
    _id: string;
    customer: CustomerItem;
    customerId: string;
    channelUser?: {
      _id: string;
      realName?: string;
    };
    expiredAt?: string;
    canReReport?: boolean;
    [key: string]: any;
  }

  interface AuditLogItem {
    _id: string;
    operator?: {
      _id: string;
      realName?: string;
      username?: string;
    };
    action: string;
    module?: string;
    target?: string;
    detail?: any;
    ip?: string;
    createdAt: string;
    [key: string]: any;
  }

  interface CompanyItem {
    _id: string;
    name: string;
    projectId?: string;
    projectName?: string;
    contactName?: string;
    contactPhone?: string;
    address?: string;
    remark?: string;
    customerCount?: number;
    createdAt?: string;
    [key: string]: any;
  }

  interface TransferLogItem {
    _id: string;
    customer?: { _id: string; name: string };
    fromUser?: { _id: string; realName?: string };
    toUser?: { _id: string; realName?: string };
    reason?: string;
    operator?: { _id: string; realName?: string };
    createdAt: string;
    [key: string]: any;
  }

  interface SystemConfig {
    _id?: string;
    projectId?: string;
    visitCountdownHours?: number;
    followupReminderDays?: number;
    publicPoolRetentionDays?: number;
    expiredPoolRetentionDays?: number;
    duplicateWindowHours?: number;
    [key: string]: any;
  }

  interface Paginated<T> {
    list: T[];
    total: number;
    page?: number;
    pageSize?: number;
  }

  interface FileUploadResult {
    url: string;
    [key: string]: any;
  }
}
