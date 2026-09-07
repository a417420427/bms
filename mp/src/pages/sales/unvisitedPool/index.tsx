import { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Button } from "@tarojs/components";
import { salesListUnvisitedPool, salesClaimUnvisited } from "@/services/api";
import Empty from "@/components/Empty";
import Tag from "@/components/Tag";
import { maskPhone } from "@/utils/common";
import { formatDate } from "@/utils/dayjs";
import dayjs from "@/utils/dayjs";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

export default function UnvisitedPool() {
  useShare({ title: "商管营销宝 - 未到访池" });
  const [list, setList] = useState<any[]>([]);

  const load = () => {
    salesListUnvisitedPool({ page: 1, pageSize: 50 }).then((res: any) => {
      setList(res.list);
    });
  };

  useEffect(() => {
    const onShow = () => load();
    Taro.eventCenter.on("didShow", onShow);
    load();
    return () => Taro.eventCenter.off("didShow", onShow);
  }, []);

  const handleClaim = (customerId: string) => {
    Taro.showModal({
      title: "提示",
      content: "确认申领该客户？",
      success: (res) => {
        if (res.confirm) {
          salesClaimUnvisited(customerId).then(() => {
            Taro.showToast({ title: "申领已提交", icon: "success" });
            load();
          });
        }
      },
    });
  };

  return (
    <View className="unvisited-pool">
      {list.length === 0 ? (
        <Empty />
      ) : (
        list.map((it) => {
          const customer = it.customerId || {};
          const expired = (it.customerId && it.customerId.expireAt)
            ? dayjs(it.customerId.expireAt).diff(dayjs())
            : 0;
          return (
            <View key={it._id} className="unvisited-item">
              <View className="unvisited-item__row">
                <Text className="unvisited-item__name">{customer.name}</Text>
                <Tag type={customer.source === "PERSONAL_REFERRAL" ? "primary" : "warning"}>
                  {customer.source === "PERSONAL_REFERRAL" ? "个人推荐" : "公司推荐"}
                </Tag>
              </View>
              <View className="unvisited-item__row">
                <Text>{maskPhone(customer.phone || "")}</Text>
                <Text>推荐人: {(customer.channelReferrer && customer.channelReferrer.referrerName) || "-"}</Text>
              </View>
              <View className="unvisited-item__row">
                <Text className="unvisited-item__time">
                  推荐时间: {formatDate(it.reportTime)}
                </Text>
                <Text className={expired > 0 ? "unvisited-item__countdown" : "warn"}>
                  {expired > 0 ? `剩余 ${Math.floor(expired / 3600000)}h` : "已过期"}
                </Text>
              </View>
              <Button
                className="unvisited-item__btn"
                onClick={() => handleClaim(customer._id)}
              >
                申领该客户
              </Button>
            </View>
          );
        })
      )}
    </View>
  );
}
