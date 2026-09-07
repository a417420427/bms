import { useState, useEffect } from "react";
import Taro, { usePullDownRefresh, useReachBottom } from "@tarojs/taro";
import { View, Text, Input, Textarea, Button, Picker } from "@tarojs/components";
import {
  adminListCompanies,
  adminCreateCompany,
  adminUpdateCompany,
  adminListProjects,
  getLocalProject,
  getLocalUserInfo,
} from "@/services/api";
import Empty from "@/components/Empty";
import Modal from "@/components/Modal/Modal";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

export default function AdminCompany() {
  useShare({ title: "商管营销宝 - 公司管理" });
  // 0907: 仅系统管理员可新建/编辑公司
  const isSystemAdmin = !!(getLocalUserInfo().isSystemAdmin);
  const [list, setList] = useState<CompanyItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [projectId, setProjectId] = useState<string | undefined>(
    getLocalProject() && getLocalProject()._id
  );
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<CompanyItem | null>(null);
  const [form, setForm] = useState<any>({
    name: "",
    projectId: undefined,
    contactName: "",
    contactPhone: "",
    address: "",
    remark: "",
  });

  const load = (p = 1) => {
    if (loading) return;
    setLoading(true);
    adminListCompanies(projectId)
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
  }, [projectId]);

  usePullDownRefresh(() => load(1));
  useReachBottom(() => {
    if (list.length < total) load(page + 1);
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      projectId: projectId || undefined,
      contactName: "",
      contactPhone: "",
      address: "",
      remark: "",
    });
    setModal(true);
  };

  const openEdit = (c: CompanyItem) => {
    setEditing(c);
    setForm({
      name: c.name,
      projectId: c.projectId,
      contactName: c.contactName || "",
      contactPhone: c.contactPhone || "",
      address: c.address || "",
      remark: c.remark || "",
    });
    setModal(true);
  };

  const submit = () => {
    if (!form.name) {
      Taro.showToast({ title: "请填写公司名称", icon: "none" });
      return;
    }
    const action = editing
      ? adminUpdateCompany(editing._id, form)
      : adminCreateCompany(form);
    action.then(() => {
      Taro.showToast({ title: "已保存", icon: "success" });
      setModal(false);
      load(1);
    });
  };

  const projectIdx = (() => {
    if (!form.projectId) return 0;
    const idx = projects.findIndex((p) => p._id === form.projectId);
    return idx >= 0 ? idx + 1 : 0;
  })();

  return (
    <View className="admin-company">
      {isSystemAdmin ? (
        <Button className="admin-company__add" onClick={openCreate}>
          + 新建公司
        </Button>
      ) : null}

      {list.length === 0 ? (
        <Empty text="暂无渠道公司" />
      ) : (
        list.map((c) => (
          <View
            key={c._id}
            className="company-item"
            onClick={isSystemAdmin ? () => openEdit(c) : undefined}
          >
            <View className="company-item__row">
              <Text className="company-item__name">{c.name}</Text>
            </View>
            <View className="company-item__row">
              <Text className="company-item__label">项目：</Text>
              <Text>{c.projectName || "-"}</Text>
            </View>
            <View className="company-item__row">
              <Text className="company-item__label">联系人：</Text>
              <Text>{c.contactName || "-"}</Text>
              <Text className="company-item__phone">
                {c.contactPhone || ""}
              </Text>
            </View>
            <View className="company-item__row">
              <Text className="company-item__label">客户数：</Text>
              <Text>{c.customerCount != null ? c.customerCount : 0}</Text>
            </View>
          </View>
        ))
      )}

      <Modal
        visible={modal}
        title={editing ? "编辑公司" : "新建公司"}
        onClose={() => setModal(false)}
      >
        <View className="company-form">
          <View className="form-item">
            <Text className="form-item__label">公司名称</Text>
            <Input
              className="form-item__input"
              placeholder="公司名称"
              value={form.name}
              onInput={(e) => setForm((p) => ({ ...p, name: e.detail.value }))}
            />
          </View>
          <View className="form-item">
            <Text className="form-item__label">所属项目</Text>
            <Picker
              mode="selector"
              range={["全部项目", ...projects.map((p) => p.name)]}
              onChange={(e) => {
                const idx = Number(e.detail.value);
                setForm((p) => ({
                  ...p,
                  projectId: idx === 0 ? undefined : projects[idx - 1] && projects[idx - 1]._id,
                }));
              }}
            >
              <View className="form-item__picker">
                {projectIdx === 0
                  ? "全部项目"
                  : (projects[projectIdx - 1] && projects[projectIdx - 1].name)}
              </View>
            </Picker>
          </View>
          <View className="form-item">
            <Text className="form-item__label">联系人</Text>
            <Input
              className="form-item__input"
              placeholder="联系人姓名"
              value={form.contactName}
              onInput={(e) =>
                setForm((p) => ({ ...p, contactName: e.detail.value }))
              }
            />
          </View>
          <View className="form-item">
            <Text className="form-item__label">联系电话</Text>
            <Input
              className="form-item__input"
              placeholder="联系电话"
              value={form.contactPhone}
              onInput={(e) =>
                setForm((p) => ({ ...p, contactPhone: e.detail.value }))
              }
            />
          </View>
          <View className="form-item">
            <Text className="form-item__label">公司地址</Text>
            <Textarea
              className="form-item__textarea"
              placeholder="公司地址"
              value={form.address}
              onInput={(e) =>
                setForm((p) => ({ ...p, address: e.detail.value }))
              }
            />
          </View>
          <View className="form-item">
            <Text className="form-item__label">备注</Text>
            <Textarea
              className="form-item__textarea"
              placeholder="备注"
              value={form.remark}
              onInput={(e) =>
                setForm((p) => ({ ...p, remark: e.detail.value }))
              }
            />
          </View>
          <Button className="company-form__btn" onClick={submit}>
            保存
          </Button>
        </View>
      </Modal>
    </View>
  );
}
