import { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Button, Input } from "@tarojs/components";
import {
  getLocalUserInfo,
  setLocalUserInfo,
  resetPassword,
  listProjects,
  switchProject,
  setLocalProject,
} from "@/services/api";
import { logout } from "@/services/auth";
import { ROLE_HOME } from "@/utils/constants";
import { ROLE_LABELS } from "@/utils/common";
import Modal from "@/components/Modal/Modal";
import "./index.scss";

export default function Mine() {
  const [userInfo, setUserInfo] = useState<UserInfoProp>(getLocalUserInfo());
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [projectModal, setProjectModal] = useState(false);
  const [pwdModal, setPwdModal] = useState(false);
  const [pwdForm, setPwdForm] = useState({ oldPassword: "", newPassword: "", confirm: "" });

  useEffect(() => {
    setUserInfo(getLocalUserInfo());
    const handler = (data: UserInfoProp) => setUserInfo(data);
    Taro.eventCenter.on("userInfoUpdate", handler);
    return () => {
      Taro.eventCenter.off("userInfoUpdate", handler)
    };
  }, []);

  useEffect(() => {
    listProjects().then((res: any) => setProjects(res || []));
  }, []);

  const goHome = () => {
    const url = ROLE_HOME[userInfo.role] || "/pages/sales/dashboard/index";
    Taro.reLaunch({ url });
  };

  const onSwitchProject = (p: ProjectItem) => {
    switchProject(p._id).then(() => {
      setLocalProject(p);
      Taro.showToast({ title: "已切换", icon: "success" });
      setProjectModal(false);
    });
  };

  const submitPwd = () => {
    if (!pwdForm.oldPassword || !pwdForm.newPassword) {
      Taro.showToast({ title: "请填写完整", icon: "none" });
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirm) {
      Taro.showToast({ title: "两次密码不一致", icon: "none" });
      return;
    }
    resetPassword(pwdForm.oldPassword, pwdForm.newPassword).then(() => {
      Taro.showToast({ title: "修改成功", icon: "success" });
      setPwdModal(false);
      setPwdForm({ oldPassword: "", newPassword: "", confirm: "" });
    });
  };

  return (
    <View className="mine">
      <View className="mine__header">
        <View className="mine__avatar">{userInfo.realName?.[0] || userInfo.username?.[0] || "?"}</View>
        <View className="mine__info">
          <Text className="mine__name">{userInfo.realName || userInfo.username}</Text>
          <Text className="mine__role">{ROLE_LABELS[userInfo.role]}</Text>
        </View>
      </View>

      <View className="mine__group">
        <View className="mine__cell" onClick={goHome}>
          <Text>工作台</Text>
          <Text className="mine__arrow">›</Text>
        </View>
        {projects.length > 0 && (
          <View className="mine__cell" onClick={() => setProjectModal(true)}>
            <Text>切换项目</Text>
            <Text className="mine__arrow">›</Text>
          </View>
        )}
        <View className="mine__cell" onClick={() => setPwdModal(true)}>
          <Text>修改密码</Text>
          <Text className="mine__arrow">›</Text>
        </View>
      </View>

      <View className="mine__group">
        <View className="mine__cell" onClick={() => Taro.navigateTo({ url: "/pages/admin/auditLog/index" })}>
          <Text>操作日志</Text>
          <Text className="mine__arrow">›</Text>
        </View>
      </View>

      <Button className="mine__logout" onClick={logout}>
        退出登录
      </Button>

      <Modal visible={projectModal} title="切换项目" onClose={() => setProjectModal(false)}>
        <View className="mine__project-list">
          {projects.map((p) => (
            <View
              key={p._id}
              className="mine__project-item"
              onClick={() => onSwitchProject(p)}
            >
              {p.name}
            </View>
          ))}
        </View>
      </Modal>

      <Modal visible={pwdModal} title="修改密码" onClose={() => setPwdModal(false)}>
        <View className="mine__pwd-form">
          <Input
            className="mine__pwd-input"
            password
            placeholder="原密码"
            value={pwdForm.oldPassword}
            onInput={(e) => setPwdForm((p) => ({ ...p, oldPassword: e.detail.value }))}
          />
          <Input
            className="mine__pwd-input"
            password
            placeholder="新密码"
            value={pwdForm.newPassword}
            onInput={(e) => setPwdForm((p) => ({ ...p, newPassword: e.detail.value }))}
          />
          <Input
            className="mine__pwd-input"
            password
            placeholder="确认新密码"
            value={pwdForm.confirm}
            onInput={(e) => setPwdForm((p) => ({ ...p, confirm: e.detail.value }))}
          />
          <Button className="mine__pwd-btn" onClick={submitPwd}>
            确认修改
          </Button>
        </View>
      </Modal>
    </View>
  );
}
