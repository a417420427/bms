import { useState } from "react";
import Taro from "@tarojs/taro";
import { View, Text, Input, Textarea, Picker, Button } from "@tarojs/components";
import { channelCreateCustomer, adminListCompanies } from "@/services/api";
import { isValidPhone, maskPhone } from "@/utils/common";
import "./index.scss";

export default function ChannelCustomerCreate() {
  const [type, setType] = useState<"A" | "B">("A");
  const [companyList, setCompanyList] = useState<any[]>([]);
  const [form, setForm] = useState<any>({
    companyName: "",
    referrerName: "",
    name: "",
    phone: "",
    reportTime: new Date().toLocaleString(),
    remark: "",
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  // 切换为 A 类时拉取合作公司
  const switchType = (t: "A" | "B") => {
    setType(t);
    if (t === "A" && companyList.length === 0) {
      adminListCompanies().then((res: any) => setCompanyList(res));
    }
  };

  const handleSubmit = async () => {
    if (!form.name) return Taro.showToast({ title: "请填写姓名", icon: "none" });
    if (!isValidPhone(form.phone)) return Taro.showToast({ title: "手机号错误", icon: "none" });
    if (type === "A" && !form.companyName) return Taro.showToast({ title: "请选择合作公司", icon: "none" });
    if (type === "B" && !form.referrerName) return Taro.showToast({ title: "请填写推荐人", icon: "none" });

    try {
      await channelCreateCustomer(type, {
        ...form,
        // A 类脱敏手机号
        phone: type === "A" ? maskPhone(form.phone) : form.phone,
      });
      Taro.showToast({ title: "提交成功", icon: "success" });
      setTimeout(() => Taro.navigateBack(), 800);
    } catch (_) {}
  };

  return (
    <View className="channel-form">
      <View className="type-switch">
        <View
          className={type === "A" ? "active" : ""}
          onClick={() => switchType("A")}
        >
          A 类（公司推荐）
        </View>
        <View
          className={type === "B" ? "active" : ""}
          onClick={() => switchType("B")}
        >
          B 类（个人推荐）
        </View>
      </View>

      {type === "A" ? (
        <View className="form-item">
          <Text className="form-item__label">合作公司*</Text>
          <Picker
            mode="selector"
            range={companyList.map((c) => c.name)}
            onChange={(e) =>
              set("companyName", companyList[Number(e.detail.value)]?.name)
            }
          >
            <View className="form-item__picker">
              {form.companyName || "请选择"}
            </View>
          </Picker>
        </View>
      ) : (
        <View className="form-item">
          <Text className="form-item__label">经纪人/推荐人姓名*</Text>
          <Input
            className="form-item__input"
            value={form.referrerName}
            onInput={(e) => set("referrerName", e.detail.value)}
          />
        </View>
      )}

      <View className="form-item">
        <Text className="form-item__label">客户姓名*</Text>
        <Input
          className="form-item__input"
          value={form.name}
          onInput={(e) => set("name", e.detail.value)}
        />
      </View>
      <View className="form-item">
        <Text className="form-item__label">
          手机号*{type === "A" ? "（前三后四脱敏）" : ""}
        </Text>
        <Input
          className="form-item__input"
          type="number"
          maxlength={11}
          value={form.phone}
          onInput={(e) => set("phone", e.detail.value)}
        />
      </View>
      <View className="form-item">
        <Text className="form-item__label">推荐时间*</Text>
        <Picker
          mode="date"
          onChange={(e) => set("reportTimeDate", e.detail.value)}
        >
          <View className="form-item__picker">{form.reportTime}</View>
        </Picker>
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
