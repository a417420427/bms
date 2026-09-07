import { useState, useEffect } from "react";
import Taro, { usePullDownRefresh, useReachBottom } from "@tarojs/taro";
import { View, Text, Input, Picker } from "@tarojs/components";
import { adminListAuditLogs, adminListUsers } from "@/services/api";
import Empty from "@/components/Empty";
import { formatDate } from "@/utils/dayjs";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

export default function AdminAuditLog() {
  useShare({ title: "商管营销宝 - 审计日志" });
  const [list, setList] = useState<AuditLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [module, setModule] = useState("");
  const [userId, setUserId] = useState("");
  const [users, setUsers] = useState<UserInfoProp[]>([]);
  const [loading, setLoading] = useState(false);

  const MODULE_OPTIONS = ["", "CUSTOMER", "USER", "PROJECT", "APPROVAL", "AUTH"];
  const MODULE_LABELS: Record<string, string> = {
    "": "全部模块",
    CUSTOMER: "客户",
    USER: "用户",
    PROJECT: "项目",
    APPROVAL: "审批",
    AUTH: "认证",
  };

  useEffect(() => {
    adminListUsers({ pageSize: 200 }).then((res: any) =>
      setUsers(res.list || res || [])
    );
  }, []);

  const load = (p = 1) => {
    if (loading) return;
    setLoading(true);
    adminListAuditLogs({
      page: p,
      pageSize: 20,
      keyword,
      module,
      userId,
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
  }, [module, userId]);

  usePullDownRefresh(() => load(1));
  useReachBottom(() => {
    if (list.length < total) load(page + 1);
  });

  return (
    <View className="admin-audit-log">
      <View className="admin-audit-log__search">
        <Input
          className="admin-audit-log__input"
          placeholder="搜索操作内容"
          value={keyword}
          onInput={(e) => setKeyword(e.detail.value)}
          onConfirm={() => load(1)}
        />
      </View>

      <View className="admin-audit-log__filter">
        <Picker
          mode="selector"
          range={MODULE_OPTIONS.map((m) => MODULE_LABELS[m])}
          onChange={(e) => setModule(MODULE_OPTIONS[Number(e.detail.value)] || "")}
        >
          <View className="admin-audit-log__picker">
            {MODULE_LABELS[module] || "全部模块"}
          </View>
        </Picker>
        <Picker
          mode="selector"
          range={["全部操作人", ...users.map((u) => u.realName || u.username)]}
          onChange={(e) => {
            const idx = Number(e.detail.value);
            setUserId(idx === 0 ? "" : (users[idx - 1] && users[idx - 1]._id) || (users[idx - 1] && users[idx - 1].id) || "");
          }}
        >
          <View className="admin-audit-log__picker">
            {userId
              ? (() => {
                  const u = users.find((x) => (x._id || x.id) === userId);
                  return u ? u.realName || u.username : "全部操作人";
                })()
              : "全部操作人"}
          </View>
        </Picker>
      </View>

      {list.length === 0 ? (
        <Empty text="暂无操作日志" />
      ) : (
        list.map((l) => (
          <View key={l._id} className="log-item">
            <View className="log-item__row">
              <Text className="log-item__operator">
                {(l.operator && l.operator.realName) || (l.operator && l.operator.username) || "系统"}
              </Text>
              <Text className="log-item__time">
                {formatDate(l.createdAt)}
              </Text>
            </View>
            <View className="log-item__action">
              {l.module ? `[${l.module}] ` : ""}
              {l.action}
            </View>
            {l.target ? (
              <View className="log-item__target">对象：{l.target}</View>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}
