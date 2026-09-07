// 本地存储 / token / 用户信息 / 业务接口封装
import Taro from "@tarojs/taro";
import http from "./request";

export const AUTH_TOKEN_KEY = "bms_auth_token";
export const LOCAL_USER_INFO_KEY = "bms_local_user_info";
export const LOCAL_PROJECT_KEY = "bms_current_project";

/** 获取本地 token */
export const getToken = (): string | null => {
  try {
    return Taro.getStorageSync(AUTH_TOKEN_KEY) || null;
  } catch (e) {
    console.error("获取token失败:", e);
    return null;
  }
};

/** 设置本地 token */
export const setToken = (token: string): void => {
  try {
    Taro.setStorageSync(AUTH_TOKEN_KEY, token);
  } catch (e) {
    console.error("存储token失败:", e);
  }
};

/** 清除 token */
export const clearToken = (): void => {
  try {
    Taro.removeStorageSync(AUTH_TOKEN_KEY);
  } catch (e) {
    console.error("清除token失败:", e);
  }
};

const emptyInfo: UserInfoProp = {
  id: "",
  username: "",
  realName: "",
  role: "ROLE_SALES",
  phone: "",
  currentProject: null,
  accessibleProjects: [],
};

export const getLocalUserInfo = (): UserInfoProp => {
  try {
    return JSON.parse(Taro.getStorageSync(LOCAL_USER_INFO_KEY)) || emptyInfo;
  } catch (e) {
    return emptyInfo;
  }
};

export const setLocalUserInfo = (userInfo: UserInfoProp): void => {
  try {
    Taro.setStorageSync(LOCAL_USER_INFO_KEY, JSON.stringify(userInfo));
  } catch (e) {
    console.error("存储用户信息失败:", e);
  }
};

/** V5/L1: 清除本地用户信息（logout 时调用） */
export const clearLocalUserInfo = (): void => {
  try {
    Taro.removeStorageSync(LOCAL_USER_INFO_KEY);
  } catch (e) {
    console.error("清除用户信息失败:", e);
  }
};

export const getLocalProject = (): ProjectItem => {
  try {
    return JSON.parse(Taro.getStorageSync(LOCAL_PROJECT_KEY)) || { _id: "", name: "" };
  } catch (e) {
    return { _id: "", name: "" };
  }
};

export const setLocalProject = (project: ProjectItem): void => {
  try {
    Taro.setStorageSync(LOCAL_PROJECT_KEY, JSON.stringify(project));
  } catch (e) {
    console.error("存储当前项目失败:", e);
  }
};

/* ============ 认证 ============ */

/** 账号密码登录 */
export const login = (username: string, password: string) => {
  return http.post<{ user: UserInfoProp; token: string }>("/auth/login", { username, password });
};

/** 微信小程序登录（用 code 换 openid） */
export const wechatLogin = (code: string) => {
  // V9: 后端不再返回 openid
  return http.post<{ bound: boolean; user?: UserInfoProp; token?: string; tempToken?: string }>("/auth/wechat/login", { code });
};

/** O1: 拉取当前登录用户最新信息（用于启动时验证 token 有效性） */
export const getMe = () => {
  return http.get<UserInfoProp>("/auth/me");
};

/** 开发环境专用：按 username 直接换取对应用户的 token（仅 dev） */
export const devSwitchUser = (username: string) => {
  return http.post<{ user: UserInfoProp; token: string }>("/auth/dev-switch-user", { username });
};

/** 微信绑定账号 */
export const wechatBind = (tempToken: string, username: string, password: string) => {
  return http.post<{ user: UserInfoProp; token: string }>("/auth/wechat/bind", { tempToken, username, password });
};

/** 解绑微信 */
export const wechatUnbind = () => {
  return http.post("/auth/wechat/unbind");
};

/** 修改密码 */
export const resetPassword = (oldPassword: string, newPassword: string) => {
  return http.post("/auth/reset-password", { oldPassword, newPassword });
};

/** 获取用户可访问项目列表 */
export const listProjects = () => {
  return http.get<ProjectItem[]>("/user/projects");
};

/** 切换项目 */
export const switchProject = (projectId: string) => {
  return http.post<ProjectItem>("/user/switch-project", { projectId });
};

/* ============ 销售员 ============ */

export const salesDashboard = () => {
  return http.get("/sales/dashboard");
};

export const salesCheckDuplicate = (phone: string) => {
  return http.post("/sales/customer/check-duplicate", { phone });
};

export const salesCreateCustomer = (data: any) => {
  return http.post("/sales/customer", data);
};

export const salesListCustomers = (data: any) => {
  return http.get<Paginated<CustomerItem>>("/sales/customers", data);
};

export const salesGetCustomer = (id: string) => {
  return http.get<CustomerItem>(`/sales/customer/${id}`);
};

export const salesUpdateIntent = (id: string, intentLevel: IntentLevel) => {
  return http.put(`/sales/customer/${id}/intent`, { intentLevel });
};

export const salesUpdateCustomer = (id: string, data: any) => {
  return http.put(`/sales/customer/${id}`, data);
};

export const salesListFollowups = (customerId: string) => {
  return http.get<FollowupItem[]>(`/sales/followups/${customerId}`);
};

export const salesCreateFollowup = (data: any) => {
  return http.post("/sales/followup", data);
};

export const salesListPublicPool = (data: any) => {
  return http.get("/sales/public-pool", data);
};

export const salesClaimPublic = (customerId: string) => {
  return http.post("/sales/public-pool/claim", { customerId });
};

export const salesListUnvisitedPool = (data: any) => {
  return http.get("/sales/unvisited-pool", data);
};

export const salesClaimUnvisited = (customerId: string) => {
  return http.post("/sales/unvisited-pool/claim", { customerId });
};

export const salesListReminder = () => {
  return http.get<CustomerItem[]>("/sales/followup-reminder");
};

/* ============ 渠道员 ============ */

export const channelDashboard = () => {
  return http.get("/channel/dashboard");
};

export const channelCreateCustomer = (type: "A" | "B", data: any) => {
  return http.post(`/channel/customer?type=${type}`, data);
};

export const channelListCustomers = (data: any) => {
  return http.get<Paginated<CustomerItem>>("/channel/customers", data);
};

export const channelGetCustomer = (id: string) => {
  return http.get<CustomerItem>(`/channel/customer/${id}`);
};

export const channelUpdateCustomer = (id: string, data: any) => {
  return http.put(`/channel/customer/${id}`, data);
};

export const channelArrive = (id: string, salesId: string) => {
  return http.post(`/channel/customer/${id}/arrive`, { salesId });
};

export const channelListExpiredPool = (data: any) => {
  return http.get("/channel/expired-pool", data);
};

export const channelReReport = (expiredPoolId: string) => {
  return http.post("/channel/report-expired", { expiredPoolId });
};

/* ============ 管理员 ============ */

export const adminDashboard = (projectId?: string) => {
  return http.get("/admin/dashboard", projectId ? { projectId } : {});
};

export const adminListCustomers = (data: any) => {
  return http.get<Paginated<CustomerItem>>("/admin/customers", data);
};

// 0907: 管理员新增客户录入（支持全部到访渠道 + 渠道公司选择）
export const adminCreateCustomer = (data: any) => {
  return http.post<CustomerItem>("/admin/customer", data);
};

export const adminGetCustomer = (id: string) => {
  return http.get<CustomerItem>(`/admin/customer/${id}`);
};

export const adminUpdateCustomer = (id: string, data: any) => {
  return http.put(`/admin/customer/${id}`, data);
};

export const adminAssignCustomer = (
  customerId: string,
  targetUserId: string,
  moveToPublicPool: boolean = false
) => {
  return http.post("/admin/assign-customer", {
    customerId,
    targetUserId,
    moveToPublicPool,
  });
};

export const adminListFollowups = (customerId: string) => {
  return http.get(`/admin/followups/${customerId}`);
};

export const adminListTransferLogs = (customerId: string) => {
  return http.get(`/admin/customer/${customerId}/transfer-log`);
};

export const adminListPublicPool = (data: any) => {
  return http.get("/admin/public-pool", data);
};

export const adminAssignFromPublic = (publicPoolId: string, targetUserId: string) => {
  return http.post("/admin/assign-from-public", { publicPoolId, targetUserId });
};

export const adminListUnvisitedApprovals = (data: any) => {
  return http.get("/admin/unvisited-approvals", data);
};

export const adminApproveUnvisited = (approvalId: string, result: "APPROVED" | "REJECTED", remark?: string) => {
  return http.post("/admin/approve-unvisited", { approvalId, result, remark });
};

export const adminApproveClaim = (approvalId: string, result: "APPROVED" | "REJECTED", remark?: string) => {
  return http.post("/admin/approve-claim", { approvalId, result, remark });
};

export const adminApproveConflict = (approvalId: string, result: "APPROVED" | "REJECTED", remark?: string) => {
  return http.post("/admin/approve-conflict", { approvalId, result, remark });
};

export const adminListExpiredPool = (data: any) => {
  return http.get("/admin/expired-pool", data);
};

export const adminExportCustomers = (data: any) => {
  return http.post("/admin/export-customers", data, { loading: false });
};

export const adminListProjects = () => {
  return http.get<ProjectItem[]>("/admin/projects");
};

export const adminCreateProject = (data: any) => {
  return http.post("/admin/projects", data);
};

export const adminUpdateProject = (id: string, data: any) => {
  return http.put(`/admin/projects/${id}`, data);
};

export const adminListUsers = (data?: any) => {
  return http.get("/admin/users", data);
};

export const adminCreateUser = (data: any) => {
  return http.post("/admin/users", data);
};

export const adminUpdateUser = (id: string, data: any) => {
  return http.put(`/admin/users/${id}`, data);
};

export const adminResetUserPassword = (id: string) => {
  return http.post(`/admin/users/${id}/reset-password`);
};

export const adminListCompanies = (projectId?: string) => {
  return http.get("/admin/companies", projectId ? { projectId } : {});
};

export const adminCreateCompany = (data: any) => {
  return http.post("/admin/companies", data);
};

export const adminUpdateCompany = (id: string, data: any) => {
  return http.put(`/admin/companies/${id}`, data);
};

export const adminGetConfig = (projectId?: string) => {
  return http.get("/admin/config", projectId ? { projectId } : {});
};

export const adminUpdateConfig = (data: any) => {
  return http.put("/admin/config", data);
};

export const adminListAuditLogs = (data: any) => {
  return http.get<Paginated<AuditLogItem>>("/admin/audit-logs", data);
};

/* ============ 文件上传 ============ */

export const uploadVisitPhoto = (filePath: string) => {
  return new Promise<{ url: string }>((resolve, reject) => {
    const token = getToken();
    Taro.uploadFile({
      url: (process.env.TARO_APP_API || "http://localhost:3000/api") + "/upload/visit-photo",
      filePath,
      name: "file",
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          if (data.code === 0) resolve(data.data);
          else reject(data);
        } catch (e) {
          reject(e);
        }
      },
      fail: (err) => reject(err),
    });
  });
};

export default {
  getToken,
  setToken,
  clearToken,
  login,
};
