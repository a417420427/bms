import { useState, useEffect } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { View, Text, Image, Picker, Button, Textarea } from "@tarojs/components";
import {
  salesGetCustomer,
  salesListFollowups,
  salesCreateFollowup,
  salesUpdateIntent,
} from "@/services/api";
import Tag from "@/components/Tag";
import Card from "@/components/Card";
import Modal from "@/components/Modal/Modal";
import Empty from "@/components/Empty";
import {
  SOURCE_LABELS,
  INTENT_LABELS,
  STATUS_LABELS,
  FOLLOWUP_METHOD_LABELS,
} from "@/utils/constants";
import { maskPhone } from "@/utils/common";
import { formatDate } from "@/utils/dayjs";
import "./index.scss";

const INTENT_OPTIONS = Object.keys(INTENT_LABELS);
const METHOD_OPTIONS = Object.keys(FOLLOWUP_METHOD_LABELS);

export default function CustomerDetail() {
  const router = useRouter();
  const id = router.params.id;
  const [customer, setCustomer] = useState<CustomerItem | null>(null);
  const [followups, setFollowups] = useState<FollowupItem[]>([]);
  const [followupModal, setFollowupModal] = useState(false);
  const [followupForm, setFollowupForm] = useState<any>({
    method: "PHONE",
    content: "",
    result: "",
  });

  const load = () => {
    if (!id) {
      console.error("[customerDetail] missing id from route");
      Taro.showToast({ title: "客户ID缺失", icon: "none" });
      return;
    }
    console.log("[customerDetail] loading id:", id);
    salesGetCustomer(id)
      .then((res: any) => {
        console.log("[customerDetail] got customer:", res);
        setCustomer(res);
      })
      .catch((e: any) => {
        console.error("[customerDetail] getCustomer failed:", e);
        Taro.showToast({ title: e?.message || "加载失败", icon: "none" });
      });
    salesListFollowups(id)
      .then((res: any) => setFollowups(res || []))
      .catch((e: any) => console.error("[customerDetail] followups failed:", e));
  };

  useEffect(() => {
    load();
  }, [id]);

  const changeIntent = (e) => {
    const intentLevel = INTENT_OPTIONS[Number(e.detail.value)] as IntentLevel;
    salesUpdateIntent(id!, intentLevel).then(() => {
      setCustomer((c) => ({ ...c, intentLevel }));
      Taro.showToast({ title: "已保存", icon: "success" });
    });
  };

  const submitFollowup = () => {
    if (!followupForm.content) {
      Taro.showToast({ title: "请填写跟进内容", icon: "none" });
      return;
    }
    salesCreateFollowup({
      customerId: id,
      followupTime: new Date().toISOString(),
      method: followupForm.method,
      content: followupForm.content,
      result: followupForm.result,
    }).then(() => {
      Taro.showToast({ title: "已添加跟进", icon: "success" });
      setFollowupModal(false);
      setFollowupForm({ method: "PHONE", content: "", result: "" });
      load();
    });
  };

  if (!customer) return <Empty text="加载中..." />;

  return (
    <View className="customer-detail">
      <Card title="基础信息">
        <View className="row">
          <Text className="row__label">姓名</Text>
          <Text>{customer.name}</Text>
        </View>
        <View className="row">
          <Text className="row__label">手机号</Text>
          <Text>{maskPhone(customer.phone)}</Text>
        </View>
        <View className="row">
          <Text className="row__label">来源</Text>
          <Text>{SOURCE_LABELS[customer.source]}</Text>
        </View>
        <View className="row">
          <Text className="row__label">状态</Text>
          <Tag>{STATUS_LABELS[customer.status]}</Tag>
        </View>
        <View className="row">
          <Text className="row__label">到访时间</Text>
          <Text>{formatDate(customer.visitTime)}</Text>
        </View>
        <View className="row">
          <Text className="row__label">意向评级</Text>
          <Picker
            mode="selector"
            range={INTENT_OPTIONS.map((k) => INTENT_LABELS[k])}
            onChange={changeIntent}
          >
            <Tag type="primary">{INTENT_LABELS[customer.intentLevel]}</Tag>
          </Picker>
        </View>
      </Card>

      <Card title="到访照片">
        <View className="photos">
          {customer.visitPhotos?.map((p, i) => (
            <Image
              key={i}
              src={p}
              mode="aspectFill"
              className="photos__item"
              onClick={() => Taro.previewImage({ urls: customer.visitPhotos, current: p })}
            />
          ))}
        </View>
      </Card>

      <Card
        title="跟进记录"
        extra={<Text onClick={() => setFollowupModal(true)}>+新增</Text>}
      >
        {followups.length === 0 ? (
          <Empty text="暂无跟进记录" />
        ) : (
          followups.map((f) => (
            <View key={f._id} className="followup-item">
              <View className="row">
                <Tag type="primary">{FOLLOWUP_METHOD_LABELS[f.method]}</Tag>
                <Text className="row__time">{formatDate(f.followupTime)}</Text>
              </View>
              <View className="followup-item__content">{f.content}</View>
              {f.result ? (
                <View className="followup-item__result">结果：{f.result}</View>
              ) : null}
            </View>
          ))
        )}
      </Card>

      <Modal
        visible={followupModal}
        title="新增跟进"
        onClose={() => setFollowupModal(false)}
      >
        <View className="followup-form">
          <Picker
            mode="selector"
            range={METHOD_OPTIONS.map((k) => FOLLOWUP_METHOD_LABELS[k])}
            onChange={(e) =>
              setFollowupForm((p) => ({ ...p, method: METHOD_OPTIONS[Number(e.detail.value)] }))
            }
          >
            <View className="form-item__picker">
              方式：{FOLLOWUP_METHOD_LABELS[followupForm.method]}
            </View>
          </Picker>
          <Textarea
            className="form-item__textarea"
            placeholder="跟进内容"
            value={followupForm.content}
            onInput={(e) => setFollowupForm((p) => ({ ...p, content: e.detail.value }))}
          />
          <Textarea
            className="form-item__textarea"
            placeholder="跟进结果（可选）"
            value={followupForm.result}
            onInput={(e) => setFollowupForm((p) => ({ ...p, result: e.detail.value }))}
          />
          <Button className="followup-form__btn" onClick={submitFollowup}>
            保存
          </Button>
        </View>
      </Modal>
    </View>
  );
}
