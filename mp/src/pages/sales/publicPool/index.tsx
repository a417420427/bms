import { useState, useEffect } from "react";
import Taro, { usePullDownRefresh } from "@tarojs/taro";
import { View, Text, Button } from "@tarojs/components";
import { salesListPublicPool, salesClaimPublic } from "@/services/api";
import Empty from "@/components/Empty";
import Tag from "@/components/Tag";
import { maskPhone } from "@/utils/common";
import { formatDate } from "@/utils/dayjs";
import "./index.scss";

export default function SalesPublicPool() {
  const [list, setList] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = (p = 1) => {
    salesListPublicPool({ page: p, pageSize: 10 }).then((res: any) => {
      setList((prev) => (p === 1 ? res.list : [...prev, ...res.list]));
      setTotal(res.total);
      setPage(p);
      Taro.stopPullDownRefresh();
    });
  };

  useEffect(() => load(1), []);
  usePullDownRefresh(() => load(1));

  const handleClaim = (customerId: string) => {
    Taro.showModal({
      title: "提示",
      content: "确认申请认领该客户？",
      success: (res) => {
        if (res.confirm) {
          salesClaimPublic(customerId).then(() => {
            Taro.showToast({ title: "申请已提交", icon: "success" });
            load(1);
          });
        }
      },
    });
  };

  return (
    <View className="public-pool">
      {list.length === 0 ? (
        <Empty />
      ) : (
        list.map((it) => (
          <View key={it._id} className="pool-item">
            <View className="pool-item__row">
              <Text className="pool-item__name">{it.customerId?.name}</Text>
              <Tag type="primary">{it.customerId?.intentLevel}</Tag>
            </View>
            <View className="pool-item__row">
              <Text>{maskPhone(it.customerId?.phone || "")}</Text>
              <Text className="pool-item__time">
                移入时间: {formatDate(it.movedAt)}
              </Text>
            </View>
            <Button
              className="pool-item__btn"
              onClick={() => handleClaim(it.customerId?._id)}
            >
              申请认领
            </Button>
          </View>
        ))
      )}
    </View>
  );
}
