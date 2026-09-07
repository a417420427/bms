import { useState } from "react";
import Taro, { usePullDownRefresh, useReachBottom, useDidShow } from "@tarojs/taro";
import { View, Text, Input } from "@tarojs/components";
import { channelListCustomers } from "@/services/api";
import Tag from "@/components/Tag";
import Empty from "@/components/Empty";
import dayjs, { formatDate } from "@/utils/dayjs";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

export default function ChannelCustomerList() {
  useShare({ title: "商管营销宝 - 我的推荐" });
  const [list, setList] = useState<CustomerItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");

  const load = (p = 1, kw = keyword) => {
    channelListCustomers({ page: p, pageSize: 10, keyword: kw }).then((res: any) => {
      setList((prev) => (p === 1 ? res.list : [...prev, ...res.list]));
      setTotal(res.total);
      setPage(p);
      Taro.stopPullDownRefresh();
    });
  };

  // 每次进入页面都刷新第 1 页
  useDidShow(() => load(1));
  usePullDownRefresh(() => load(1));
  useReachBottom(() => {
    if (list.length < total) load(page + 1);
  });

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/channel/customerDetail/index?id=${id}` });
  };

  return (
    <View className="channel-list">
      <View className="channel-list__search">
        <Input
          className="channel-list__input"
          placeholder="搜索姓名"
          value={keyword}
          onInput={(e) => setKeyword(e.detail.value)}
          onConfirm={() => load(1, keyword)}
        />
      </View>
      {list.length === 0 ? (
        <Empty />
      ) : (
        list.map((c) => {
          const expire = c.expireAt ? dayjs(c.expireAt).diff(dayjs()) : 0;
          return (
            <View
              key={c._id}
              className="channel-item"
              onClick={() => goDetail(c._id)}
            >
              <View className="channel-item__row">
                <Text className="channel-item__name">{c.name}</Text>
                <Tag type={c.source === "PERSONAL_REFERRAL" ? "primary" : "warning"}>
                  {c.source === "PERSONAL_REFERRAL" ? "个人" : "公司"}
                </Tag>
              </View>
              <View className="channel-item__row">
                <Text>{c.phoneMasked || c.phone}</Text>
                <Text>{c.channelReferrer && c.channelReferrer.referrerName}</Text>
              </View>
              <View className="channel-item__row">
                <Text className="channel-item__time">
                  {formatDate(c.createdAt)}
                </Text>
                <Text className={c.hasVisited ? "" : expire > 0 ? "primary" : "warn"}>
                  {c.hasVisited
                    ? "已到访"
                    : expire > 0
                      ? `剩余 ${Math.floor(expire / 3600000)}h`
                      : "已过期"}
                </Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
