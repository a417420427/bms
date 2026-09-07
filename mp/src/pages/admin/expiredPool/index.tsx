import { useState, useEffect } from "react";
import Taro, { usePullDownRefresh, useReachBottom } from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { adminListExpiredPool, getLocalProject } from "@/services/api";
import Tag from "@/components/Tag";
import Empty from "@/components/Empty";
import { maskPhone } from "@/utils/common";
import { formatDate } from "@/utils/dayjs";
import "./index.scss";

export default function AdminExpiredPool() {
  const [list, setList] = useState<ExpiredPoolItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [projectId, setProjectId] = useState<string | undefined>(
    getLocalProject()?._id
  );
  const [loading, setLoading] = useState(false);

  const load = (p = 1) => {
    if (loading) return;
    setLoading(true);
    adminListExpiredPool({ page: p, pageSize: 10, projectId })
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
  }, [projectId]);

  usePullDownRefresh(() => load(1));
  useReachBottom(() => {
    if (list.length < total) load(page + 1);
  });

  const goDetail = (customerId?: string) => {
    if (!customerId) return;
    Taro.navigateTo({
      url: `/pages/admin/customerDetail/index?id=${customerId}`,
    });
  };

  return (
    <View className="admin-expired-pool">
      {list.length === 0 ? (
        <Empty text="过期池暂无客户" />
      ) : (
        list.map((p) => (
          <View
            key={p._id}
            className="expired-item"
            onClick={() => goDetail(p.customerId)}
          >
            <View className="expired-item__row">
              <Text className="expired-item__name">{p.customer.name}</Text>
              <Tag type="danger">已过期</Tag>
            </View>
            <View className="expired-item__row">
              <Text className="expired-item__phone">
                {maskPhone(p.customer.phone)}
              </Text>
              <Text className="expired-item__time">
                过期：{formatDate(p.expiredAt, "YYYY-MM-DD")}
              </Text>
            </View>
            <View className="expired-item__row">
              <Text className="expired-item__channel">
                渠道员：{p.channelUser?.realName || "-"}
              </Text>
              {p.canReReport ? (
                <Tag type="warning">可重新报备</Tag>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}
