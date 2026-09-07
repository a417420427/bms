import { useState, useEffect } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Input, Textarea, Picker, Button } from "@tarojs/components";
import { channelCreateCustomer, adminListCompanies } from "@/services/api";
import { isValidPhone, maskPhone } from "@/utils/common";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

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

// 0907: 渠道员只负责推荐，表单仅保留：渠道公司、姓名、电话、预计到访时间
export default function ChannelCustomerCreate() {
  useShare({ title: "商管营销宝 - 推荐客户" });
  const [companyList, setCompanyList] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    companyId: "",
    name: "",
    phone: "",
    visitDate: todayStr(),
    visitTime: nowTimeStr(),
    remark: "",
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  // 0907: 第一行就是选择渠道，进入页面即拉取合作公司列表
  useEffect(() => {
    adminListCompanies().then((res: any) => setCompanyList(res || []));
  }, []);

  const handleSubmit = async () => {
    if (!form.companyId) return Taro.showToast({ title: "请选择渠道公司", icon: "none" });
    if (!form.name) return Taro.showToast({ title: "请填写客户姓名", icon: "none" });
    if (!isValidPhone(form.phone)) return Taro.showToast({ title: "手机号格式错误", icon: "none" });
    if (!form.visitDate || !form.visitTime) return Taro.showToast({ title: "请选择预计到访时间", icon: "none" });

    // 拼接日期+时间为 ISO 字符串
    const visitTimeISO = new Date(`${form.visitDate}T${form.visitTime}:00`).toISOString();

    try {
      // A类（公司推荐）：手机号前三后四脱敏
      await channelCreateCustomer("A", {
        name: form.name,
        phone: maskPhone(form.phone),
        companyId: form.companyId,
        recommendTime: visitTimeISO,
        remark: form.remark,
      });
      Taro.showToast({ title: "推荐成功", icon: "success" });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (_) {}
  };

  const selectedCompany = companyList.find((c) => c._id === form.companyId);

  return (
    <View className="channel-form">
      {/* 0907: 录入页面第一行就是选择渠道 */}
      <View className="form-item">
        <Text className="form-item__label">选择渠道公司*</Text>
        <Picker
          mode="selector"
          range={companyList.map((c) => c.name)}
          onChange={(e) => {
            const c = companyList[Number(e.detail.value)];
            if (c) set("companyId", c._id);
          }}
        >
          <View className="form-item__picker">
            {(selectedCompany && selectedCompany.name) || "请选择"}
          </View>
        </Picker>
      </View>

      <View className="form-item">
        <Text className="form-item__label">客户姓名*</Text>
        <Input
          className="form-item__input"
          value={form.name}
          onInput={(e) => set("name", e.detail.value)}
        />
      </View>

      <View className="form-item">
        <Text className="form-item__label">电话*（前三后四脱敏）</Text>
        <Input
          className="form-item__input"
          type="number"
          maxlength={11}
          value={form.phone}
          onInput={(e) => set("phone", e.detail.value)}
        />
        <Text className="form-item__hint">提交时自动脱敏为 138****1234 格式</Text>
      </View>

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
        <Text className="form-item__label">备注</Text>
        <Textarea
          className="form-item__textarea"
          value={form.remark}
          onInput={(e) => set("remark", e.detail.value)}
        />
      </View>
      <Button className="channel-form__submit" onClick={handleSubmit}>
        提交
      </Button>
    </View>
  );
}
