import { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Picker, Button } from "@tarojs/components";
import {
  adminExportCustomers,
  adminListProjects,
  getLocalProject,
} from "@/services/api";
import Empty from "@/components/Empty";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

export default function AdminExport() {
  useShare({ title: "商管营销宝 - 数据导出" });
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [form, setForm] = useState<any>({
    projectId: getLocalProject() && getLocalProject()._id,
    source: "",
    intentLevel: "",
    status: "",
    startDate: "",
    endDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    adminListProjects().then((res: any) => setProjects(res || []));
    try {
      const h = Taro.getStorageSync("bms_export_history") || [];
      setHistory(h);
    } catch (e) {
      setHistory([]);
    }
  }, []);

  const onDateChange = (field: "startDate" | "endDate", e: any) => {
    setForm((p) => ({ ...p, [field]: e.detail.value }));
  };

  const submit = () => {
    setLoading(true);
    adminExportCustomers(form)
      .then((res: any) => {
        const url = (res && res.url) || res;
        if (url) {
          Taro.showModal({
            title: "导出成功",
            content: "是否下载导出文件？",
            success: (r) => {
              if (r.confirm) {
                Taro.downloadFile({
                  url,
                  success: (d) => {
                    Taro.openDocument({
                      filePath: d.tempFilePath,
                      fail: () =>
                        Taro.showToast({
                          title: "打开失败",
                          icon: "none",
                        }),
                    });
                  },
                  fail: () =>
                    Taro.showToast({ title: "下载失败", icon: "none" }),
                });
              }
            },
          });
          setHistory((prev) => [url, ...prev].slice(0, 5));
          Taro.setStorageSync(
            "bms_export_history",
            [url, ...history].slice(0, 5)
          );
        } else {
          Taro.showToast({ title: "导出成功", icon: "success" });
        }
      })
      .finally(() => setLoading(false));
  };

  return (
    <View className="admin-export">
      <View className="admin-export__form">
        <View className="form-item">
          <Text className="form-item__label">项目</Text>
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
              {form.projectId
                ? (projects.find((p) => p._id === form.projectId) && projects.find((p) => p._id === form.projectId).name) ||
                  "全部项目"
                : "全部项目"}
            </View>
          </Picker>
        </View>

        <View className="form-item">
          <Text className="form-item__label">开始日期</Text>
          <Picker
            mode="date"
            value={form.startDate}
            onChange={(e) => onDateChange("startDate", e)}
          >
            <View className="form-item__picker">
              {form.startDate || "选择开始日期"}
            </View>
          </Picker>
        </View>

        <View className="form-item">
          <Text className="form-item__label">结束日期</Text>
          <Picker
            mode="date"
            value={form.endDate}
            onChange={(e) => onDateChange("endDate", e)}
          >
            <View className="form-item__picker">
              {form.endDate || "选择结束日期"}
            </View>
          </Picker>
        </View>
      </View>

      <Button
        className="admin-export__btn"
        loading={loading}
        disabled={loading}
        onClick={submit}
      >
        {loading ? "导出中..." : "导出客户数据"}
      </Button>

      <View className="admin-export__history">
        <View className="admin-export__title">最近导出</View>
        {history.length === 0 ? (
          <Empty text="暂无导出记录" />
        ) : (
          history.map((url, i) => (
            <View
              key={i}
              className="history-item"
              onClick={() =>
                Taro.setClipboardData({
                  data: url,
                  success: () =>
                    Taro.showToast({ title: "链接已复制", icon: "success" }),
                })
              }
            >
              <Text className="history-item__name">导出文件 {i + 1}</Text>
              <Text className="history-item__action">复制链接</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
