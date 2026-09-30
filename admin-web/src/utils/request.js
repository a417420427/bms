import axios from "axios";
import { ElMessage } from "element-plus";
import router from "@/router";

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 30000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // 项目上下文：所有业务请求携带当前项目 ID
  const projectId = localStorage.getItem("currentProjectId");
  if (projectId) {
    config.headers["X-Project-Id"] = projectId;
  }
  return config;
});

request.interceptors.response.use(
  (response) => {
    // 后端约定：{ code, message, data }，code === 0 表示成功
    const res = response.data;
    if (res && typeof res === "object" && "code" in res) {
      if (res.code === 0) {
        return res.data !== undefined ? res.data : res;
      }
      ElMessage.error(res.message || "请求失败");
      return Promise.reject(new Error(res.message || "请求失败"));
    }
    return res;
  },
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem("token");
      router.push("/login");
      ElMessage.error("登录已过期，请重新登录");
    } else if (status === 403) {
      ElMessage.error("无权限执行该操作");
    } else {
      ElMessage.error(error.response?.data?.message || "网络异常，请稍后重试");
    }
    return Promise.reject(error);
  }
);

export default request;
