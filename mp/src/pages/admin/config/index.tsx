import { useState, useEffect } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, Input, Button, Picker } from "@tarojs/components";
import {
  adminGetConfig,
  adminUpdateConfig,
  adminListProjects,
  getLocalProject,
} from "@/services/api";
import Empty from "@/components/Empty";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

export default function AdminConfig() {
  useShare({ title: "商管营销宝 - 系统配置" });
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [projectId, setProjectId] = useState<string | undefined>(
    getLocalProject() && getLocalProject()._id
  );
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (loading) return;
    setLoading(true);
    adminGetConfig(projectId)
      .then((res: any) => setConfig(res))
      .finally(() => {
        setLoading(false);
        Taro.stopPullDownRefresh();
      });
  };

  useEffect(() => {
    adminListProjects().then((res: any) => setProjects(res || []));
  }, []);

  useEffect(() => {
    load();
  }, [projectId]);

  usePullDownRefresh(load);

  const change = (field: keyof SystemConfig, value: any) => {
    setConfig((c) => (c ? { ...c, [field]: value } : c));
  };

  const save = () => {
    if (!config) return;
    setSaving(true);
    adminUpdateConfig({ ...config, projectId })
      .then(() => Taro.showToast({ title: "已保存", icon: "success" }))
      .finally(() => setSaving(false));
  };

  if (!config) return <Empty text="加载中..." />;

  const projectIdx = (() => {
    if (!projectId) return 0;
    const idx = projects.findIndex((p) => p._id === projectId);
    return idx >= 0 ? idx + 1 : 0;
  })();

  return (
    <View className="admin-config">
      <View className="admin-config__project">
        <Text className="admin-config__label">配置项目</Text>
        <Picker
          mode="selector"
          range={["全部项目", ...projects.map((p) => p.name)]}
          onChange={(e) => {
            const idx = Number(e.detail.value);
            setProjectId(idx === 0 ? undefined : projects[idx - 1] && projects[idx - 1]._id);
          }}
        >
          <View className="admin-config__picker">
            {projectIdx === 0 ? "全部项目（默认）" : (projects[projectIdx - 1] && projects[projectIdx - 1].name)}
          </View>
        </Picker>
      </View>

      <View className="admin-config__group">
        <View className="admin-config__title">到访倒计时</View>
        <View className="admin-config__field">
          <Text className="admin-config__label">到访倒计时（小时）</Text>
          <Input
            className="admin-config__input"
            type="number"
            value={String(config.visitCountdownHours != null ? config.visitCountdownHours : 24)}
            onInput={(e) =>
              change("visitCountdownHours", Number(e.detail.value))
            }
          />
        </View>
      </View>

      <View className="admin-config__group">
        <View className="admin-config__title">跟进提醒</View>
        <View className="admin-config__field">
          <Text className="admin-config__label">跟进提醒（天）</Text>
          <Input
            className="admin-config__input"
            type="number"
            value={String(config.followupReminderDays != null ? config.followupReminderDays : 3)}
            onInput={(e) =>
              change("followupReminderDays", Number(e.detail.value))
            }
          />
        </View>
      </View>

      <View className="admin-config__group">
        <View className="admin-config__title">公共池</View>
        <View className="admin-config__field">
          <Text className="admin-config__label">公共池保留（天）</Text>
          <Input
            className="admin-config__input"
            type="number"
            value={String(config.publicPoolRetentionDays != null ? config.publicPoolRetentionDays : 30)}
            onInput={(e) =>
              change("publicPoolRetentionDays", Number(e.detail.value))
            }
          />
        </View>
      </View>

      <View className="admin-config__group">
        <View className="admin-config__title">过期池</View>
        <View className="admin-config__field">
          <Text className="admin-config__label">过期池保留（天）</Text>
          <Input
            className="admin-config__input"
            type="number"
            value={String(config.expiredPoolRetentionDays != null ? config.expiredPoolRetentionDays : 90)}
            onInput={(e) =>
              change("expiredPoolRetentionDays", Number(e.detail.value))
            }
          />
        </View>
      </View>

      <View className="admin-config__group">
        <View className="admin-config__title">查重</View>
        <View className="admin-config__field">
          <Text className="admin-config__label">查重时间窗口（小时）</Text>
          <Input
            className="admin-config__input"
            type="number"
            value={String(config.duplicateWindowHours != null ? config.duplicateWindowHours : 72)}
            onInput={(e) =>
              change("duplicateWindowHours", Number(e.detail.value))
            }
          />
        </View>
      </View>

      <Button
        className="admin-config__btn"
        loading={saving}
        disabled={saving}
        onClick={save}
      >
        保存配置
      </Button>
    </View>
  );
}
