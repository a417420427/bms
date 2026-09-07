import { useState, useEffect } from "react";
import Taro, { usePullDownRefresh, useReachBottom } from "@tarojs/taro";
import { View, Text, Textarea, Button } from "@tarojs/components";
import {
  adminListUnvisitedApprovals,
  adminApproveUnvisited,
} from "@/services/api";
import Tag from "@/components/Tag";
import Empty from "@/components/Empty";
import { APPROVAL_RESULT_LABELS } from "@/utils/constants";
import { maskPhone } from "@/utils/common";
import { formatDate } from "@/utils/dayjs";
import Modal from "@/components/Modal/Modal";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

export default function AdminUnvisitedApproval() {
  useShare({ title: "商管营销宝 - 审批" });
  const [list, setList] = useState<ApprovalItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [current, setCurrent] = useState<ApprovalItem | null>(null);
  const [remark, setRemark] = useState("");

  const load = (p = 1) => {
    if (loading) return;
    setLoading(true);
    adminListUnvisitedApprovals({ page: p, pageSize: 10 })
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

  const openHandle = (item: ApprovalItem) => {
    setCurrent(item);
    setRemark("");
    setModal(true);
  };

  const submit = (result: "APPROVED" | "REJECTED") => {
    if (!current) return;
    adminApproveUnvisited(current._id, result, remark).then(() => {
      Taro.showToast({
        title: result === "APPROVED" ? "已同意" : "已驳回",
        icon: "success",
      });
      setModal(false);
      load(1);
    });
  };

  return (
    <View className="admin-approval">
      {list.length === 0 ? (
        <Empty text="暂无待审批申领" />
      ) : (
        list.map((a) => (
          <View key={a._id} className="approval-item">
            <View className="approval-item__row">
              <Text className="approval-item__customer">
                {(a.customer && a.customer.name) || "-"}
              </Text>
              <Tag type={a.result === "PENDING" ? "warning" : "default"}>
                {APPROVAL_RESULT_LABELS[a.result]}
              </Tag>
            </View>
            <View className="approval-item__row">
              <Text className="approval-item__phone">
                {a.customer ? maskPhone(a.customer.phone) : "-"}
              </Text>
              <Text className="approval-item__time">
                {formatDate(a.createdAt)}
              </Text>
            </View>
            <View className="approval-item__row">
              <Text className="approval-item__applicant">
                申请人：{(a.applicant && a.applicant.realName) || "-"}
              </Text>
            </View>
            {a.result === "PENDING" ? (
              <Button
                className="approval-item__btn"
                onClick={() => openHandle(a)}
              >
                处理
              </Button>
            ) : null}
          </View>
        ))
      )}

      <Modal
        visible={modal}
        title="审批处理"
        onClose={() => setModal(false)}
      >
        <View className="approval-form">
          <View className="approval-form__info">
            <View className="row">
              <Text>客户：</Text>
              <Text>{current && current.customer && current.customer.name}</Text>
            </View>
            <View className="row">
              <Text>申请人：</Text>
              <Text>{current && current.applicant && current.applicant.realName}</Text>
            </View>
          </View>
          <Textarea
            className="approval-form__textarea"
            placeholder="审批备注（可选）"
            value={remark}
            onInput={(e) => setRemark(e.detail.value)}
          />
          <View className="approval-form__actions">
            <Button
              className="approval-form__btn approval-form__btn--reject"
              onClick={() => submit("REJECTED")}
            >
              驳回
            </Button>
            <Button
              className="approval-form__btn approval-form__btn--approve"
              onClick={() => submit("APPROVED")}
            >
              同意
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}
