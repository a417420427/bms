import { defineStore } from "pinia";

export const useProjectStore = defineStore("project", {
  state: () => ({
    projects: JSON.parse(localStorage.getItem("projects") || "[]"),
    currentProjectId: localStorage.getItem("currentProjectId") || "",
  }),
  getters: {
    currentProject: (state) =>
      state.projects.find((p) => p.projectId === state.currentProjectId) || null,
    needsSelect: (state) => !!state.projects.length && !state.currentProjectId,
  },
  actions: {
    setProjects(projects) {
      // 后端返回 { _id, name, isDefault } → 统一映射为 projectId/projectName
      this.projects = (projects || []).map((p) => ({
        projectId: p.projectId || p._id,
        projectName: p.projectName || p.name,
        isDefault: !!p.isDefault,
      }));
      localStorage.setItem("projects", JSON.stringify(this.projects));
      // 恢复默认项目
      if (!this.currentProjectId) {
        const def = projects.find((p) => p.isDefault) || projects[0];
        if (def) this.setCurrent(def.projectId);
      }
    },
    setCurrent(projectId) {
      this.currentProjectId = projectId;
      localStorage.setItem("currentProjectId", projectId);
    },
    async switchProject(projectId) {
      // TODO: 对接 POST /api/user/switch-project
      this.setCurrent(projectId);
    },
    clear() {
      this.projects = [];
      this.currentProjectId = "";
      localStorage.removeItem("projects");
      localStorage.removeItem("currentProjectId");
    },
  },
});
