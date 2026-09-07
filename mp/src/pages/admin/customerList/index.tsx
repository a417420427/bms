import { useState, useEffect, useRef } from "react";
import Taro, { usePullDownRefresh, useReachBottom, useDidShow } from "@tarojs/taro";
import { View, Text, Input, Picker } from "@tarojs/components";
import {
  adminListCustomers,
  adminListProjects,
  getLocalProject,
} from "@/services/api";
import Tag from "@/components/Tag";
import Empty from "@/components/Empty";
import {
  SOURCE_LABELS,
  INTENT_LABELS,
  STATUS_LABELS,
} from "@/utils/constants";
import { maskPhone } from "@/utils/common";
import { formatDate } from "@/utils/dayjs";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

const STATUS_OPTIONS = ["", ...Object.keys(STATUS_LABELS)];
const INTENT_OPTIONS = ["", ...Object.keys(INTENT_LABELS)];

export default function AdminCustomerList() {
  useShare({ title: "商管营销宝 - 客户管理" });
  const [list, setList] = useState<CustomerItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [intentLevel, setIntentLevel] = useState("");
  const [projectId, setProjectId] = useState<string | undefined>(
    getLocalProject() && getLocalProject()._id
  );
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    adminListProjects().then((res: any) => setProjects(res || []));
  }, []);

  const load = (p = 1) => {
    if (loading) return;
    setLoading(true);
    adminListCustomers({
      page: p,
      pageSize: 10,
      keyword,
      status,
      intentLevel,
      projectId,
    })
      .then((res: any) => {
        setList((prev) => (p === 1 ? res.list : [...prev, ...res.list]));
        setTotal(res.total);
        setPage(p);
      })
      .finally(() => {
        setLoading(false);
        Taro.stopPullDownRefresh();
      });
  };

  useEffect(() => {
    load(1);
  }, [status, intentLevel, projectId]);

  // 页面显示时刷新第 1 页（从新增/详情页返回能看到最新数据）
  // 用 ref 跳过首次，避免与上面的 useEffect 重复
  const initedRef = useRef(false);
  useDidShow(() => {
    if (!initedRef.current) {
      initedRef.current = true;
      return;
    }
    load(1);
  });

  usePullDownRefresh(() => load(1));
  useReachBottom(() => {
    if (list.length < total) load(page + 1);
  });

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/admin/customerDetail/index?id=${id}` });
  };

  const projectIdx = (() => {
    if (!projectId) return 0;
    const idx = projects.findIndex((p) => p._id === projectId);
    return idx >= 0 ? idx + 1 : 0;
  })();

  return (
    <View className="admin-customer-list">
      <View className="admin-customer-list__search">
        <Input
          className="admin-customer-list__input"
          placeholder="搜索姓名/手机号"
          value={keyword}
          onInput={(e) => setKeyword(e.detail.value)}
          onConfirm={() => load(1)}
        />
      </View>

      <View className="admin-customer-list__filter">
        <Picker
          mode="selector"
          range={["全部状态", ...Object.keys(STATUS_LABELS).map((k) => STATUS_LABELS[k])]}
          onChange={(e) => setStatus(STATUS_OPTIONS[Number(e.detail.value)] || "")}
        >
          <View className="admin-customer-list__picker">
            {status ? STATUS_LABELS[status] : "全部状态"}
          </View>
        </Picker>
        <Picker
          mode="selector"
          range={["全部意向", ...Object.keys(INTENT_LABELS).map((k) => INTENT_LABELS[k])]}
          onChange={(e) => setIntentLevel(INTENT_OPTIONS[Number(e.detail.value)] || "")}
        >
          <View className="admin-customer-list__picker">
            {intentLevel ? INTENT_LABELS[intentLevel] : "全部意向"}
          </View>
        </Picker>
        <Picker
          mode="selector"
          range={["全部项目", ...projects.map((p) => p.name)]}
          onChange={(e) => {
            const idx = Number(e.detail.value);
            setProjectId(idx === 0 ? undefined : projects[idx - 1] && projects[idx - 1]._id);
          }}
        >
          <View className="admin-customer-list__picker">
            {projectIdx === 0 ? "全部项目" : (projects[projectIdx - 1] && projects[projectIdx - 1].name)}
          </View>
        </Picker>
      </View>

      {list.length === 0 ? (
        <Empty />
      ) : (
        list.map((c) => (
          <View
            key={c._id}
            className="customer-item"
            onClick={() => goDetail(c._id)}
          >
            <View className="customer-item__row">
              <Text className="customer-item__name">{c.name}</Text>
              <Tag
                type={
                  c.intentLevel === "HIGH"
                    ? "danger"
                    : c.intentLevel === "NONE"
                    ? "default"
                    : "primary"
                }
              >
                {INTENT_LABELS[c.intentLevel]}
              </Tag>
            </View>
            <View className="customer-item__row">
              <Text className="customer-item__phone">{maskPhone(c.phone)}</Text>
              <Text className="customer-item__source">
                {SOURCE_LABELS[c.source]}
              </Text>
            </View>
            <View className="customer-item__row">
              <Text className="customer-item__time">
                项目：{c.projectName || "-"}
              </Text>
              <Text className="customer-item__time">
                销售员：{(c.owner && c.owner.realName) || "-"}
              </Text>
            </View>
            <View className="customer-item__row">
              <Text className="customer-item__time">
                到访：{formatDate(c.visitTime, "YYYY-MM-DD")}
              </Text>
              <Tag type="default">{STATUS_LABELS[c.status]}</Tag>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
