import { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { salesListReminder } from "@/services/api";
import Tag from "@/components/Tag";
import Empty from "@/components/Empty";
import { maskPhone } from "@/utils/common";
import dayjs from "@/utils/dayjs";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

export default function Reminder() {
  useShare({ title: "商管营销宝 - 跟进提醒" });
  const [list, setList] = useState<CustomerItem[]>([]);

  useEffect(() => {
    salesListReminder().then((res: any) => setList(res));
  }, []);

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/sales/customerDetail/index?id=${id}` });
  };

  return (
    <View className="reminder">
      {list.length === 0 ? (
        <Empty text="无预警客户" />
      ) : (
        list.map((c) => (
          <View key={c._id} className="reminder-item" onClick={() => goDetail(c._id)}>
            <View className="reminder-item__row">
              <Text className="reminder-item__name">{c.name}</Text>
              <Tag type="danger">30天未跟进</Tag>
            </View>
            <View className="reminder-item__row">
              <Text>{maskPhone(c.phone)}</Text>
              <Text className="reminder-item__time">
                上次跟进: {c.lastFollowupAt ? dayjs(c.lastFollowupAt).fromNow() : "从未跟进"}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
