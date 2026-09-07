import { useState, useEffect } from "react";
import Taro, { usePullDownRefresh, useReachBottom } from "@tarojs/taro";
import { View, Text, Input } from "@tarojs/components";
import { salesListCustomers } from "@/services/api";
import Tag from "@/components/Tag";
import Empty from "@/components/Empty";
import { SOURCE_LABELS, INTENT_LABELS, STATUS_LABELS } from "@/utils/constants";
import { maskPhone } from "@/utils/common";
import dayjs, { formatDate } from "@/utils/dayjs";
import "./index.scss";

export default function CustomerList() {
  const [list, setList] = useState<CustomerItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const load = (p = 1, kw = keyword) => {
    if (loading) return;
    setLoading(true);
    salesListCustomers({ page: p, pageSize: 10, keyword: kw })
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
  }, []);

  usePullDownRefresh(() => load(1));
  useReachBottom(() => {
    if (list.length < total) load(page + 1);
  });

  const goDetail = (id: string) => {
    Taro.navigateTo({ url: `/pages/sales/customerDetail/index?id=${id}` });
  };

  return (
    <View className="customer-list">
      <View className="customer-list__search">
        <Input
          className="customer-list__input"
          placeholder="搜索姓名/手机号"
          value={keyword}
          onInput={(e) => setKeyword(e.detail.value)}
          onConfirm={() => load(1, keyword)}
        />
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
              <Tag type={c.intentLevel === "HIGH" ? "danger" : c.intentLevel === "NONE" ? "default" : "primary"}>
                {INTENT_LABELS[c.intentLevel]}
              </Tag>
            </View>
            <View className="customer-item__row">
              <Text className="customer-item__phone">{maskPhone(c.phone)}</Text>
              <Text className="customer-item__source">{SOURCE_LABELS[c.source]}</Text>
            </View>
            <View className="customer-item__row">
              <Text className="customer-item__time">
                到访: {formatDate(c.visitTime, "YYYY-MM-DD")}
              </Text>
              <Text className="customer-item__time">
                跟进: {c.lastFollowupAt ? dayjs(c.lastFollowupAt).fromNow() : "未跟进"}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}
