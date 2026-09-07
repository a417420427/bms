import { useState, useEffect } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, Input, Textarea, Button } from "@tarojs/components";
import {
  adminListProjects,
  adminCreateProject,
  adminUpdateProject,
  getLocalUserInfo,
} from "@/services/api";
import Empty from "@/components/Empty";
import Modal from "@/components/Modal/Modal";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

export default function AdminProject() {
  useShare({ title: "商管营销宝 - 项目配置" });
  // 0907: 仅系统管理员可新建/编辑项目
  const isSystemAdmin = !!(getLocalUserInfo().isSystemAdmin);
  const [list, setList] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ProjectItem | null>(null);
  const [form, setForm] = useState<any>({
    name: "",
    code: "",
    address: "",
    developer: "",
  });

  const load = () => {
    if (loading) return;
    setLoading(true);
    adminListProjects()
      .then((res: any) => setList(res || []))
      .finally(() => {
        setLoading(false);
        Taro.stopPullDownRefresh();
      });
  };

  useEffect(() => {
    load();
  }, []);

  usePullDownRefresh(load);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", code: "", address: "", developer: "" });
    setModal(true);
  };

  const openEdit = (p: ProjectItem) => {
    setEditing(p);
    setForm({
      name: p.name || "",
      code: p.code || "",
      address: p.address || "",
      developer: p.developer || "",
    });
    setModal(true);
  };

  const submit = () => {
    if (!form.name) {
      Taro.showToast({ title: "请填写项目名称", icon: "none" });
      return;
    }
    const action = editing
      ? adminUpdateProject(editing._id, form)
      : adminCreateProject(form);
    action.then(() => {
      Taro.showToast({ title: "已保存", icon: "success" });
      setModal(false);
      load();
    });
  };

  return (
    <View className="admin-project">
      {isSystemAdmin ? (
        <Button className="admin-project__add" onClick={openCreate}>
          + 新建项目
        </Button>
      ) : null}

      {list.length === 0 ? (
        <Empty text="暂无项目" />
      ) : (
        list.map((p) => (
          <View
            key={p._id}
            className="project-item"
            onClick={isSystemAdmin ? () => openEdit(p) : undefined}
          >
            <View className="project-item__row">
              <Text className="project-item__name">{p.name}</Text>
            </View>
            {p.code ? (
              <View className="project-item__row">
                <Text className="project-item__label">编号：</Text>
                <Text>{p.code}</Text>
              </View>
            ) : null}
            {p.developer ? (
              <View className="project-item__row">
                <Text className="project-item__label">开发商：</Text>
                <Text>{p.developer}</Text>
              </View>
            ) : null}
            {p.address ? (
              <View className="project-item__row">
                <Text className="project-item__label">地址：</Text>
                <Text>{p.address}</Text>
              </View>
            ) : null}
          </View>
        ))
      )}

      <Modal
        visible={modal}
        title={editing ? "编辑项目" : "新建项目"}
        onClose={() => setModal(false)}
      >
        <View className="project-form">
          <View className="form-item">
            <Text className="form-item__label">项目名称</Text>
            <Input
              className="form-item__input"
              placeholder="请输入项目名称"
              value={form.name}
              onInput={(e) => setForm((p) => ({ ...p, name: e.detail.value }))}
            />
          </View>
          <View className="form-item">
            <Text className="form-item__label">项目编号</Text>
            <Input
              className="form-item__input"
              placeholder="请输入项目编号"
              value={form.code}
              onInput={(e) => setForm((p) => ({ ...p, code: e.detail.value }))}
            />
          </View>
          <View className="form-item">
            <Text className="form-item__label">开发商</Text>
            <Input
              className="form-item__input"
              placeholder="请输入开发商"
              value={form.developer}
              onInput={(e) =>
                setForm((p) => ({ ...p, developer: e.detail.value }))
              }
            />
          </View>
          <View className="form-item">
            <Text className="form-item__label">项目地址</Text>
            <Textarea
              className="form-item__textarea"
              placeholder="请输入项目地址"
              value={form.address}
              onInput={(e) =>
                setForm((p) => ({ ...p, address: e.detail.value }))
              }
            />
          </View>
          <Button className="project-form__btn" onClick={submit}>
            保存
          </Button>
        </View>
      </Modal>
    </View>
  );
}
