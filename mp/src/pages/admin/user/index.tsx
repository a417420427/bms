import { useState, useEffect } from "react";
import Taro, { usePullDownRefresh, useReachBottom } from "@tarojs/taro";
import { View, Text, Input, Picker, Button } from "@tarojs/components";
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminResetUserPassword,
  adminListProjects,
  getLocalUserInfo,
} from "@/services/api";
import Tag from "@/components/Tag";
import Empty from "@/components/Empty";
import Modal from "@/components/Modal/Modal";
import { ROLE } from "@/utils/constants";
import { ROLE_LABELS } from "@/utils/common";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

const ROLE_OPTIONS: RoleType[] = [
  ROLE.ROLE_SALES,
  ROLE.ROLE_CHANNEL,
  ROLE.ROLE_ADMIN,
];

export default function AdminUser() {
  useShare({ title: "商管营销宝 - 用户管理" });
  // 0907: 仅系统管理员可新建/编辑用户
  const isSystemAdmin = !!(getLocalUserInfo().isSystemAdmin);
  const [list, setList] = useState<UserInfoProp[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<UserInfoProp | null>(null);
  const [form, setForm] = useState<any>({
    username: "",
    realName: "",
    phone: "",
    role: ROLE.ROLE_SALES,
    password: "",
    projectIds: [],
  });

  const load = (p = 1) => {
    if (loading) return;
    setLoading(true);
    adminListUsers({ page: p, pageSize: 10, keyword, role })
      .then((res: any) => {
        const data = res.list || res || [];
        setList((prev) => (p === 1 ? data : [...prev, ...data]));
        setTotal(res.total != null ? res.total : data.length);
        setPage(p);
      })
      .finally(() => {
        setLoading(false);
        Taro.stopPullDownRefresh();
      });
  };

  useEffect(() => {
    adminListProjects().then((res: any) => setProjects(res || []));
    load(1);
  }, []);

  usePullDownRefresh(() => load(1));
  useReachBottom(() => {
    if (list.length < total) load(page + 1);
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      username: "",
      realName: "",
      phone: "",
      role: ROLE.ROLE_SALES,
      password: "",
      projectIds: [],
    });
    setModal(true);
  };

  const openEdit = (u: UserInfoProp) => {
    setEditing(u);
    setForm({
      username: u.username,
      realName: u.realName,
      phone: u.phone,
      role: u.role,
      projectIds: (u.accessibleProjects || []).map((p) => p._id),
    });
    setModal(true);
  };

  const toggleProject = (pid: string) => {
    setForm((p) => {
      const exists = p.projectIds.includes(pid);
      return {
        ...p,
        projectIds: exists
          ? p.projectIds.filter((x: string) => x !== pid)
          : [...p.projectIds, pid],
      };
    });
  };

  const submit = () => {
    if (!form.username || !form.realName) {
      Taro.showToast({ title: "请填写完整", icon: "none" });
      return;
    }
    if (!editing && !form.password) {
      Taro.showToast({ title: "请设置初始密码", icon: "none" });
      return;
    }
    if (form.projectIds.length === 0) {
      Taro.showToast({ title: "请至少选择一个可访问项目", icon: "none" });
      return;
    }
    // 后端期望 accessibleProjects（数组）+ currentProject（第一个项目）
    // 前端表单用的是 projectIds，提交时映射成后端字段名
    const payload = editing
      ? {
          realName: form.realName,
          phone: form.phone,
          role: form.role,
          accessibleProjects: form.projectIds,
          // 编辑时不强制改 currentProject（用户可能在个人中心已切换过）
        }
      : {
          username: form.username,
          password: form.password,
          realName: form.realName,
          phone: form.phone,
          role: form.role,
          accessibleProjects: form.projectIds,
          currentProject: form.projectIds[0], // 默认第一个项目
        };
    const action = editing
      ? adminUpdateUser(editing._id || editing.id, payload)
      : adminCreateUser(payload);
    action.then(() => {
      Taro.showToast({ title: "已保存", icon: "success" });
      setModal(false);
      load(1);
    });
  };

  const resetPwd = (u: UserInfoProp) => {
    Taro.showModal({
      title: "重置密码",
      content: `确认重置 ${u.realName} 的密码为默认密码？`,
      success: (r) => {
        if (r.confirm) {
          adminResetUserPassword(u._id || u.id).then((res: any) => {
            Taro.showModal({
              title: "重置成功",
              content: `新密码：${(res && res.password) || "默认密码"}`,
              showCancel: false,
            });
          });
        }
      },
    });
  };

  return (
    <View className="admin-user">
      {isSystemAdmin ? (
        <Button className="admin-user__add" onClick={openCreate}>
          + 新建用户
        </Button>
      ) : null}

      {list.length === 0 ? (
        <Empty text="暂无用户" />
      ) : (
        list.map((u) => (
          <View key={u._id || u.id} className="user-item">
            <View className="user-item__row">
              <Text className="user-item__name">{u.realName}</Text>
              <Tag type="primary">{ROLE_LABELS[u.role]}</Tag>
            </View>
            <View className="user-item__row">
              <Text className="user-item__account">{u.username}</Text>
              <Text className="user-item__phone">{u.phone || "-"}</Text>
            </View>
            <View className="user-item__actions">
              {isSystemAdmin ? (
                <Text
                  className="user-item__action"
                  onClick={() => openEdit(u)}
                >
                  编辑
                </Text>
              ) : null}
              {isSystemAdmin ? (
                <Text
                  className="user-item__action user-item__action--primary"
                  onClick={() => resetPwd(u)}
                >
                  重置密码
                </Text>
              ) : null}
            </View>
          </View>
        ))
      )}

      <Modal
        visible={modal}
        title={editing ? "编辑用户" : "新建用户"}
        onClose={() => setModal(false)}
      >
        <View className="user-form">
          <View className="form-item">
            <Text className="form-item__label">账号</Text>
            <Input
              className="form-item__input"
              placeholder="登录账号"
              value={form.username}
              disabled={!!editing}
              onInput={(e) =>
                setForm((p) => ({ ...p, username: e.detail.value }))
              }
            />
          </View>
          <View className="form-item">
            <Text className="form-item__label">姓名</Text>
            <Input
              className="form-item__input"
              placeholder="真实姓名"
              value={form.realName}
              onInput={(e) =>
                setForm((p) => ({ ...p, realName: e.detail.value }))
              }
            />
          </View>
          <View className="form-item">
            <Text className="form-item__label">手机号</Text>
            <Input
              className="form-item__input"
              placeholder="手机号"
              value={form.phone}
              onInput={(e) =>
                setForm((p) => ({ ...p, phone: e.detail.value }))
              }
            />
          </View>
          <View className="form-item">
            <Text className="form-item__label">角色</Text>
            <Picker
              mode="selector"
              range={ROLE_OPTIONS.map((r) => ROLE_LABELS[r])}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  role: ROLE_OPTIONS[Number(e.detail.value)],
                }))
              }
            >
              <View className="form-item__picker">
                {ROLE_LABELS[form.role]}
              </View>
            </Picker>
          </View>
          {!editing ? (
            <View className="form-item">
              <Text className="form-item__label">初始密码</Text>
              <Input
                className="form-item__input"
                password
                placeholder="初始登录密码"
                value={form.password}
                onInput={(e) =>
                  setForm((p) => ({ ...p, password: e.detail.value }))
                }
              />
            </View>
          ) : null}
          <View className="form-item">
            <Text className="form-item__label">可访问项目</Text>
            <View className="form-item__projects">
              {projects.map((p) => (
                <View
                  key={p._id}
                  className={`project-tag ${
                    form.projectIds.includes(p._id) ? "project-tag--active" : ""
                  }`}
                  onClick={() => toggleProject(p._id)}
                >
                  {p.name}
                </View>
              ))}
            </View>
          </View>
          <Button className="user-form__btn" onClick={submit}>
            保存
          </Button>
        </View>
      </Modal>
    </View>
  );
}
