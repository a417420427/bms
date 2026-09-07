import { useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Input, Textarea, Picker, Button } from "@tarojs/components";
import {
  salesCheckDuplicate,
  salesCreateCustomer,
} from "@/services/api";
import ImageUploader from "@/components/ImageUploader";
import {
  SOURCE_LABELS,
  INTENT_LABELS,
  CUSTOMER_SOURCE,
} from "@/utils/constants";
import { isValidPhone, debounce } from "@/utils/common";
import "./index.scss";

const SOURCE_OPTIONS = Object.keys(SOURCE_LABELS);
const INTENT_OPTIONS = Object.keys(INTENT_LABELS);

export default function CustomerCreate() {
  const [form, setForm] = useState<any>({
    name: "",
    phone: "",
    age: "",
    source: CUSTOMER_SOURCE.SELF_VISIT,
    visitTime: new Date().toISOString(),
    intentLevel: "MEDIUM",
    remark: "",
    visitPhotos: [],
  });
  const [dupMsg, setDupMsg] = useState("");

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const checkPhone = debounce(async (phone: string) => {
    if (!isValidPhone(phone)) return;
    try {
      const res: any = await salesCheckDuplicate(phone);
      if (res.exists) {
        setDupMsg("该手机号已存在，提交后将发起冲突审批");
      } else {
        setDupMsg("");
      }
    } catch (_) {}
  }, 400);

  const handleSubmit = async () => {
    if (!form.name) return Taro.showToast({ title: "请填写姓名", icon: "none" });
    if (!isValidPhone(form.phone)) return Taro.showToast({ title: "手机号格式错误", icon: "none" });
    if (!form.visitTime) return Taro.showToast({ title: "请选择到访时间", icon: "none" });

    try {
      const res: any = await salesCreateCustomer(form);
      if (res.needApproval) {
        Taro.showModal({
          title: "已发起冲突审批",
          content: "客户冲突，已自动发起审批，待管理员同意后归档",
          showCancel: false,
        });
      } else {
        Taro.showToast({ title: "录入成功", icon: "success" });
      }
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (_) {}
  };

  return (
    <View className="customer-form">
      <View className="form-item">
        <Text className="form-item__label">客户姓名*</Text>
        <Input
          className="form-item__input"
          value={form.name}
          onInput={(e) => set("name", e.detail.value)}
        />
      </View>
      <View className="form-item">
        <Text className="form-item__label">联系电话*</Text>
        <Input
          className="form-item__input"
          type="number"
          maxlength={11}
          value={form.phone}
          onInput={(e) => {
            set("phone", e.detail.value);
            checkPhone(e.detail.value);
          }}
        />
        {dupMsg ? <Text className="form-item__warn">{dupMsg}</Text> : null}
      </View>
      <View className="form-item">
        <Text className="form-item__label">年龄</Text>
        <Input
          className="form-item__input"
          type="number"
          value={form.age}
          onInput={(e) => set("age", e.detail.value)}
        />
      </View>
      <View className="form-item">
        <Text className="form-item__label">到访渠道*</Text>
        <Picker
          mode="selector"
          range={SOURCE_OPTIONS.map((k) => SOURCE_LABELS[k])}
          onChange={(e) => set("source", SOURCE_OPTIONS[Number(e.detail.value)])}
        >
          <View className="form-item__picker">
            {SOURCE_LABELS[form.source]}
          </View>
        </Picker>
      </View>
      <View className="form-item">
        <Text className="form-item__label">到访时间*</Text>
        <Picker
          mode="date"
          value={form.visitTime}
          onChange={(e) => set("visitTimeDate", e.detail.value)}
        >
          <View className="form-item__picker">{form.visitTime}</View>
        </Picker>
      </View>
      <View className="form-item">
        <Text className="form-item__label">客户意向评级*</Text>
        <Picker
          mode="selector"
          range={INTENT_OPTIONS.map((k) => INTENT_LABELS[k])}
          onChange={(e) => set("intentLevel", INTENT_OPTIONS[Number(e.detail.value)])}
        >
          <View className="form-item__picker">{INTENT_LABELS[form.intentLevel]}</View>
        </Picker>
      </View>
      <View className="form-item">
        <Text className="form-item__label">到访现场水印照片（可选）</Text>
        <ImageUploader
          value={form.visitPhotos}
          max={5}
          onChange={(urls) => set("visitPhotos", urls)}
        />
      </View>
      <View className="form-item">
        <Text className="form-item__label">备注</Text>
        <Textarea
          className="form-item__textarea"
          value={form.remark}
          onInput={(e) => set("remark", e.detail.value)}
        />
      </View>
      <Button className="customer-form__submit" onClick={handleSubmit}>
        提交
      </Button>
    </View>
  );
}
