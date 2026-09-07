import { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Input, Textarea, Picker, Button } from "@tarojs/components";
import {
  adminCreateCustomer,
  adminListCompanies,
  adminListUsers,
} from "@/services/api";
import ImageUploader from "@/components/ImageUploader";
import {
  SOURCE_LABELS,
  INTENT_LABELS,
  CUSTOMER_SOURCE,
} from "@/utils/constants";
import { isValidPhone } from "@/utils/common";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

// 0907: 管理员可选全部到访渠道
const ADMIN_SOURCE_OPTIONS = Object.keys(SOURCE_LABELS);
const INTENT_OPTIONS = Object.keys(INTENT_LABELS);

function pad(n: number) {
  return n < 10 ? "0" + n : "" + n;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowTimeStr() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AdminCustomerCreate() {
  useShare({ title: "商管营销宝 - 新增客户" });
  const [form, setForm] = useState<any>({
    name: "",
    phone: "",
    age: "",
    source: CUSTOMER_SOURCE.SELF_VISIT,
    visitDate: todayStr(),
    visitTime: nowTimeStr(),
    intentLevel: "MEDIUM",
    remark: "",
    visitPhotos: [],
    companyId: "",
    referrerName: "",
    ownerId: "",
  });
  const [companyList, setCompanyList] = useState<any[]>([]);
  const [salesList, setSalesList] = useState<any[]>([]);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  // 渠道公司推荐时拉取合作公司列表
  useEffect(() => {
    if (form.source === CUSTOMER_SOURCE.CHANNEL_COMPANY && companyList.length === 0) {
      adminListCompanies().then((res: any) => setCompanyList(res || []));
    }
  }, [form.source]);

  // 拉取销售员列表（可选归属人）
  useEffect(() => {
    if (salesList.length === 0) {
      adminListUsers({ role: "ROLE_SALES" }).then((res: any) => {
        setSalesList(Array.isArray(res) ? res : (res && res.list) || []);
      });
    }
  }, []);

  const handleSubmit = async () => {
    if (!form.name) return Taro.showToast({ title: "请填写姓名", icon: "none" });
    if (!isValidPhone(form.phone)) return Taro.showToast({ title: "手机号格式错误", icon: "none" });
    if (!form.visitDate || !form.visitTime) return Taro.showToast({ title: "请选择预计到访时间", icon: "none" });
    if (form.source === CUSTOMER_SOURCE.CHANNEL_COMPANY && !form.companyId) {
      return Taro.showToast({ title: "请选择渠道公司", icon: "none" });
    }
    if (form.source === CUSTOMER_SOURCE.PERSONAL_REFERRAL && !form.referrerName) {
      return Taro.showToast({ title: "请填写推荐人姓名", icon: "none" });
    }

    // 拼接日期+时间为 ISO 字符串
    const visitTimeISO = new Date(`${form.visitDate}T${form.visitTime}:00`).toISOString();

    try {
      await adminCreateCustomer({
        name: form.name,
        phone: form.phone,
        age: form.age,
        source: form.source,
        intentLevel: form.intentLevel,
        visitTime: visitTimeISO,
        visitPhotos: form.visitPhotos,
        remark: form.remark,
        companyId: form.source === CUSTOMER_SOURCE.CHANNEL_COMPANY ? form.companyId : undefined,
        referrerName: form.source === CUSTOMER_SOURCE.PERSONAL_REFERRAL ? form.referrerName : undefined,
        ownerId: form.ownerId || undefined,
      });
      Taro.showToast({ title: "录入成功", icon: "success" });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (_) {}
  };

  return (
    <View className="admin-customer-form">
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
          onInput={(e) => set("phone", e.detail.value)}
        />
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
          range={ADMIN_SOURCE_OPTIONS.map((k) => SOURCE_LABELS[k])}
          onChange={(e) => set("source", ADMIN_SOURCE_OPTIONS[Number(e.detail.value)])}
        >
          <View className="form-item__picker">
            {SOURCE_LABELS[form.source]}
          </View>
        </Picker>
      </View>

      {/* 渠道公司推荐：选择合作公司 */}
      {form.source === CUSTOMER_SOURCE.CHANNEL_COMPANY ? (
        <View className="form-item">
          <Text className="form-item__label">渠道公司*</Text>
          <Picker
            mode="selector"
            range={companyList.map((c) => c.name)}
            onChange={(e) => {
              const c = companyList[Number(e.detail.value)];
              if (c) set("companyId", c._id);
            }}
          >
            <View className="form-item__picker">
              {(companyList.find((c) => c._id === form.companyId) || {}).name || "请选择"}
            </View>
          </Picker>
        </View>
      ) : null}

      {/* 个人推荐：推荐人姓名 */}
      {form.source === CUSTOMER_SOURCE.PERSONAL_REFERRAL ? (
        <View className="form-item">
          <Text className="form-item__label">推荐人姓名*</Text>
          <Input
            className="form-item__input"
            value={form.referrerName}
            onInput={(e) => set("referrerName", e.detail.value)}
          />
        </View>
      ) : null}

      <View className="form-item">
        <Text className="form-item__label">预计到访时间*</Text>
        <View className="form-item__datetime">
          <Picker
            mode="date"
            value={form.visitDate}
            onChange={(e) => set("visitDate", e.detail.value)}
          >
            <View className="form-item__picker">{form.visitDate}</View>
          </Picker>
          <Picker
            mode="time"
            value={form.visitTime}
            onChange={(e) => set("visitTime", e.detail.value)}
          >
            <View className="form-item__picker">{form.visitTime}</View>
          </Picker>
        </View>
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

      {/* 可选：指定归属销售员 */}
      <View className="form-item">
        <Text className="form-item__label">归属销售员（可选）</Text>
        <Picker
          mode="selector"
          range={salesList.map((s) => (s.realName || s.username) + (s.phone ? " " + s.phone : ""))}
          onChange={(e) => {
            const s = salesList[Number(e.detail.value)];
            if (s) set("ownerId", s._id);
          }}
        >
          <View className="form-item__picker">
            {(salesList.find((s) => s._id === form.ownerId) || {}).realName
              || (salesList.find((s) => s._id === form.ownerId) || {}).username
              || "不指定（待分配）"}
          </View>
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
      <Button className="admin-customer-form__submit" onClick={handleSubmit}>
        提交
      </Button>
    </View>
  );
}
