import { defineStore } from "pinia";

export const useUserStore = defineStore("user", {
  state: () => ({
    token: localStorage.getItem("token") || "",
    userInfo: JSON.parse(localStorage.getItem("userInfo") || "null"),
  }),
  getters: {
    isSystemAdmin: (state) => !!state.userInfo?.isSystemAdmin,
    isLoggedIn: (state) => !!state.token,
  },
  actions: {
    setLogin({ token, user }) {
      this.token = token;
      this.userInfo = user;
      localStorage.setItem("token", token);
      localStorage.setItem("userInfo", JSON.stringify(user));
    },
    logout() {
      this.token = "";
      this.userInfo = null;
      localStorage.removeItem("token");
      localStorage.removeItem("userInfo");
    },
  },
});
