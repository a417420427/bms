import { useState, useEffect } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { View, Text, Button, Input, Textarea } from "@tarojs/components";
import {
  channelGetCustomer,
  channelUpdateCustomer,
  channelArrive,
  adminListUsers,
} from "@/services/api";
import Card from "@/components/Card";
import Tag from "@/components/Tag";
import Empty from "@/components/Empty";
import Modal from "@/components/Modal/Modal";
import { formatDate } from "@/utils/dayjs";
import dayjs from "@/utils/dayjs";
import { ROLE } from "@/utils/constants";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

export default function ChannelCustomerDetail() {
  useShare({ title: "商管营销宝 - 客户详情" });
  const router = useRouter();
  const id = router.params.id;
  const [customer, setCustomer] = useState<CustomerItem | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [arriveModal, setArriveModal] = useState(false);
  const [salesList, setSalesList] = useState<UserInfoProp[]>([]);
  const [editForm, setEditForm] = useState<any>({});
  const [salesId, setSalesId] = useState("");

  const load = () => {
    channelGetCustomer(id!).then((res: any) => setCustomer(res));
  };

  useEffect(() => {
    load();
  }, []);

  const handleEdit = () => {
    if (!customer) return;
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      remark: customer.remark,
    });
    setEditModal(true);
  };

  const submitEdit = async () => {
    await channelUpdateCustomer(id!, editForm);
    Taro.showToast({ title: "已保存", icon: "success" });
    setEditModal(false);
    load();
  };

  const handleArrive = () => {
    if (!customer) return;
    adminListUsers({ role: ROLE.ROLE_SALES }).then((res: any) => {
      setSalesList(res);
      setArriveModal(true);
    });
  };

  const submitArrive = async () => {
    if (!salesId) {
      Taro.showToast({ title: "请选择销售员", icon: "none" });
      return;
    }
    await channelArrive(id!, salesId);
    Taro.showToast({ title: "已标记到访", icon: "success" });
    setArriveModal(false);
    load();
  };

  if (!customer) return <Empty text="加载中..." />;

  const expired = customer.status === "EXPIRED";
  const visited = customer.hasVisited;
  const expire = customer.expireAt ? dayjs(customer.expireAt).diff(dayjs()) : 0;

  return (
    <View className="channel-detail">
      {expired ? (
        <View className="expired-tip">
          客户已过期，请前往过期客户池重新报备
        </View>
      ) : null}

      <Card title="基础信息" extra={!visited && !expired ? (
        <Text onClick={handleEdit}>编辑</Text>
      ) : null}>
        <View className="row">
          <Text className="row__label">姓名</Text>
          <Text>{customer.name}</Text>
        </View>
        <View className="row">
          <Text className="row__label">手机号</Text>
          <Text>{customer.phoneMasked || customer.phone}</Text>
        </View>
        <View className="row">
          <Text className="row__label">推荐人</Text>
          <Text>{(customer.channelReferrer && customer.channelReferrer.referrerName) || "-"}</Text>
        </View>
        <View className="row">
          <Text className="row__label">推荐时间</Text>
          <Text>{formatDate(customer.createdAt)}</Text>
        </View>
        <View className="row">
          <Text className="row__label">状态</Text>
          {visited ? (
            <Tag type="success">已到访</Tag>
          ) : expired ? (
            <Tag type="danger">已过期</Tag>
          ) : expire > 0 ? (
            <Tag type="primary">剩余 {Math.floor(expire / 3600000)}h</Tag>
          ) : null}
        </View>
      </Card>

      {!visited && !expired ? (
        <Button className="channel-detail__btn" onClick={handleArrive}>
          标记已到访
        </Button>
      ) : null}

      <Modal
        visible={editModal}
        title="编辑客户"
        onClose={() => setEditModal(false)}
      >
        <View className="edit-form">
          <Input
            className="edit-form__input"
            placeholder="姓名"
            value={editForm.name}
            onInput={(e) => setEditForm((p) => ({ ...p, name: e.detail.value }))}
          />
          <Input
            className="edit-form__input"
            placeholder="手机号"
            value={editForm.phone}
            onInput={(e) => setEditForm((p) => ({ ...p, phone: e.detail.value }))}
          />
          <Textarea
            className="edit-form__textarea"
            placeholder="备注"
            value={editForm.remark}
            onInput={(e) => setEditForm((p) => ({ ...p, remark: e.detail.value }))}
          />
          <Button className="edit-form__btn" onClick={submitEdit}>保存</Button>
        </View>
      </Modal>

      <Modal
        visible={arriveModal}
        title="选择接待销售员"
        onClose={() => setArriveModal(false)}
      >
        <View className="sales-list">
          {salesList.map((s) => (
            <View
              key={s.id}
              className={`sales-item${salesId === s.id ? " active" : ""}`}
              onClick={() => setSalesId(s.id)}
            >
              <Text>{s.realName}</Text>
              <Text className="sales-item__phone">{s.phone || ""}</Text>
            </View>
          ))}
          <Button className="sales-list__btn" onClick={submitArrive}>确认</Button>
        </View>
      </Modal>
    </View>
  );
}
