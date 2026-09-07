import { useState, useEffect } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { View, Text, Image, Picker, Button, Textarea } from "@tarojs/components";
import {
  adminGetCustomer,
  adminUpdateCustomer,
  adminListFollowups,
  adminListTransferLogs,
  adminAssignCustomer,
  adminListUsers,
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

export default function AdminCustomerDetail() {
  const router = useRouter();
  const id = router.params.id;
  const [customer, setCustomer] = useState<CustomerItem | null>(null);
  const [followups, setFollowups] = useState<FollowupItem[]>([]);
  const [transferLogs, setTransferLogs] = useState<TransferLogItem[]>([]);
  const [assignModal, setAssignModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [users, setUsers] = useState<UserInfoProp[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [editForm, setEditForm] = useState<any>({});

  const load = () => {
    adminGetCustomer(id!).then((res: any) => {
      setCustomer(res);
      setEditForm({
        name: res.name,
        phone: res.phone,
        intentLevel: res.intentLevel,
        remark: res.remark || "",
      });
    });
    adminListFollowups(id!).then((res: any) => setFollowups(res));
    adminListTransferLogs(id!).then((res: any) => setTransferLogs(res));
  };

  useEffect(() => {
    load();
  }, []);

  const openAssign = () => {
    adminListUsers({ role: "ROLE_SALES", pageSize: 200 }).then((res: any) => {
      setUsers(res.list || res || []);
      setAssignModal(true);
    });
  };

  const submitAssign = () => {
    if (!targetUserId) {
      Taro.showToast({ title: "请选择销售员", icon: "none" });
      return;
    }
    adminAssignCustomer(id!, targetUserId).then(() => {
      Taro.showToast({ title: "已分配", icon: "success" });
      setAssignModal(false);
      setTargetUserId("");
      load();
    });
  };

  const submitEdit = () => {
    if (!editForm.name || !editForm.phone) {
      Taro.showToast({ title: "请填写完整", icon: "none" });
      return;
    }
    adminUpdateCustomer(id!, editForm).then(() => {
      Taro.showToast({ title: "已保存", icon: "success" });
      setEditModal(false);
      load();
    });
  };

  if (!customer) return <Empty text="加载中..." />;

  return (
    <View className="admin-customer-detail">
      <Card
        title="基础信息"
        extra={<Text onClick={() => setEditModal(true)}>编辑</Text>}
      >
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
          <Text className="row__label">意向</Text>
          <Tag type="primary">{INTENT_LABELS[customer.intentLevel]}</Tag>
        </View>
        <View className="row">
          <Text className="row__label">项目</Text>
          <Text>{customer.projectName || "-"}</Text>
        </View>
        <View className="row">
          <Text className="row__label">销售员</Text>
          <Text>{customer.owner?.realName || "-"}</Text>
        </View>
        <View className="row">
          <Text className="row__label">到访时间</Text>
          <Text>{formatDate(customer.visitTime)}</Text>
        </View>
        {customer.remark ? (
          <View className="row">
            <Text className="row__label">备注</Text>
            <Text>{customer.remark}</Text>
          </View>
        ) : null}
      </Card>

      <Card title="到访照片">
        <View className="photos">
          {customer.visitPhotos?.length ? (
            customer.visitPhotos.map((p, i) => (
              <Image
                key={i}
                src={p}
                mode="aspectFill"
                className="photos__item"
                onClick={() =>
                  Taro.previewImage({
                    urls: customer.visitPhotos!,
                    current: p,
                  })
                }
              />
            ))
          ) : (
            <Empty text="暂无到访照片" />
          )}
        </View>
      </Card>

      <Card
        title="分配销售员"
        extra={<Text onClick={openAssign}>重新分配</Text>}
      >
        <View className="row">
          <Text className="row__label">当前销售</Text>
          <Text>{customer.owner?.realName || "未分配"}</Text>
        </View>
      </Card>

      <Card title="跟进记录">
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

      <Card title="转移记录">
        {transferLogs.length === 0 ? (
          <Empty text="暂无转移记录" />
        ) : (
          transferLogs.map((t) => (
            <View key={t._id} className="transfer-item">
              <View className="row">
                <Text className="row__label">
                  {t.fromUser?.realName || "系统"}
                </Text>
                <Text className="row__arrow">→</Text>
                <Text>{t.toUser?.realName || "-"}</Text>
              </View>
              <View className="row">
                <Text className="row__time">{formatDate(t.createdAt)}</Text>
                {t.reason ? (
                  <Text className="row__time">{t.reason}</Text>
                ) : null}
              </View>
            </View>
          ))
        )}
      </Card>

      <Modal
        visible={assignModal}
        title="分配销售员"
        onClose={() => setAssignModal(false)}
      >
        <Picker
          mode="selector"
          range={users.map((u) => `${u.realName}（${u.username}）`)}
          onChange={(e) => setTargetUserId(users[Number(e.detail.value)]._id || users[Number(e.detail.value)].id)}
        >
          <View className="form-item__picker">
            {targetUserId
              ? (() => {
                  const u = users.find((x) => (x._id || x.id) === targetUserId);
                  return u ? `${u.realName}（${u.username}）` : "请选择销售员";
                })()
              : "请选择销售员"}
          </View>
        </Picker>
        <Button className="form-item__btn" onClick={submitAssign}>
          确认分配
        </Button>
      </Modal>

      <Modal
        visible={editModal}
        title="编辑客户"
        onClose={() => setEditModal(false)}
      >
        <View className="edit-form">
          <View className="edit-form__field">
            <Text className="edit-form__label">姓名</Text>
            <Textarea
              className="edit-form__input"
              value={editForm.name}
              onInput={(e) =>
                setEditForm((p) => ({ ...p, name: e.detail.value }))
              }
            />
          </View>
          <View className="edit-form__field">
            <Text className="edit-form__label">手机号</Text>
            <Textarea
              className="edit-form__input"
              value={editForm.phone}
              onInput={(e) =>
                setEditForm((p) => ({ ...p, phone: e.detail.value }))
              }
            />
          </View>
          <View className="edit-form__field">
            <Text className="edit-form__label">意向评级</Text>
            <Picker
              mode="selector"
              range={INTENT_OPTIONS.map((k) => INTENT_LABELS[k])}
              onChange={(e) =>
                setEditForm((p) => ({
                  ...p,
                  intentLevel: INTENT_OPTIONS[Number(e.detail.value)],
                }))
              }
            >
              <View className="form-item__picker">
                {INTENT_LABELS[editForm.intentLevel]}
              </View>
            </Picker>
          </View>
          <View className="edit-form__field">
            <Text className="edit-form__label">备注</Text>
            <Textarea
              className="edit-form__textarea"
              value={editForm.remark}
              onInput={(e) =>
                setEditForm((p) => ({ ...p, remark: e.detail.value }))
              }
            />
          </View>
          <Button className="form-item__btn" onClick={submitEdit}>
            保存
          </Button>
        </View>
      </Modal>
    </View>
  );
}
