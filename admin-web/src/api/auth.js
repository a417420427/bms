import request from "@/utils/request";

export const loginApi = (data) => request.post("/auth/login", data);

export const resetPasswordApi = (data) => request.post("/auth/reset-password", data);

export const getUserProjectsApi = () => request.get("/user/projects");

export const switchProjectApi = (projectId) =>
  request.post("/user/switch-project", { projectId });
