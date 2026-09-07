import { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Button } from "@tarojs/components";
import { channelListExpiredPool, channelReReport } from "@/services/api";
import Tag from "@/components/Tag";
import Empty from "@/components/Empty";
import { formatDate } from "@/utils/dayjs";
import "./index.scss";

export default function ChannelExpiredPool() {
  const [list, setList] = useState<any[]>([]);

  const load = () => {
    channelListExpiredPool({ page: 1, pageSize: 50 }).then((res: any) =>
      setList(res.list)
    );
  };

  useEffect(() => load(), []);

  const handleReReport = (expiredPoolId: string) => {
    Taro.showModal({
      title: "提示",
      content: "确认重新报备？将开启 24 小时倒计时",
      success: (res) => {
        if (res.confirm) {
          channelReReport(expiredPoolId).then(() => {
            Taro.showToast({ title: "已重新报备", icon: "success" });
            load();
          });
        }
      },
    });
  };

  return (
    <View className="expired-pool">
      {list.length === 0 ? (
        <Empty />
      ) : (
        list.map((it) => (
          <View key={it._id} className="expired-item">
            <View className="expired-item__row">
              <Text className="expired-item__name">{it.customerId?.name}</Text>
              <Tag type={it.customerId?.source === "PERSONAL_REFERRAL" ? "primary" : "warning"}>
                {it.customerId?.source === "PERSONAL_REFERRAL" ? "个人" : "公司"}
              </Tag>
            </View>
            <View className="expired-item__row">
              <Text>原推荐人: {it.customerId?.channelReferrer?.referrerName || "-"}</Text>
              <Text className="expired-item__time">
                过期: {formatDate(it.expiredAt)}
              </Text>
            </View>
            <Button
              className="expired-item__btn"
              onClick={() => handleReReport(it._id)}
            >
              重新报备
            </Button>
          </View>
        ))
      )}
    </View>
  );
}
