import { useState, useEffect } from "react";
import Taro, { usePullDownRefresh, useReachBottom } from "@tarojs/taro";
import { View, Text, Picker, Button } from "@tarojs/components";
import {
  adminListPublicPool,
  adminAssignFromPublic,
  adminListUsers,
  getLocalProject,
} from "@/services/api";
import Tag from "@/components/Tag";
import Empty from "@/components/Empty";
import { maskPhone } from "@/utils/common";
import { formatDate } from "@/utils/dayjs";
import Modal from "@/components/Modal/Modal";
import { useShare } from "@/hooks/useShare";
import "./index.scss";

export default function AdminPublicPool() {
  useShare({ title: "商管营销宝 - 公共池" });
  const [list, setList] = useState<PublicPoolItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [projectId, setProjectId] = useState<string | undefined>(
    getLocalProject() && getLocalProject()._id
  );
  const [loading, setLoading] = useState(false);
  const [assignModal, setAssignModal] = useState(false);
  const [currentPoolId, setCurrentPoolId] = useState("");
  const [users, setUsers] = useState<UserInfoProp[]>([]);
  const [targetUserId, setTargetUserId] = useState("");

  const load = (p = 1) => {
    if (loading) return;
    setLoading(true);
    adminListPublicPool({ page: p, pageSize: 10, projectId })
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
  }, [projectId]);

  usePullDownRefresh(() => load(1));
  useReachBottom(() => {
    if (list.length < total) load(page + 1);
  });

  const openAssign = (poolId: string) => {
    setCurrentPoolId(poolId);
    setTargetUserId("");
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
    adminAssignFromPublic(currentPoolId, targetUserId).then(() => {
      Taro.showToast({ title: "已分配", icon: "success" });
      setAssignModal(false);
      load(1);
    });
  };

  return (
    <View className="admin-public-pool">
      {list.length === 0 ? (
        <Empty text="公共池暂无客户" />
      ) : (
        list.map((p) => (
          <View key={p._id} className="pool-item">
            <View className="pool-item__row">
              <Text className="pool-item__name">{p.customer.name}</Text>
              <Tag type="default">{p.customer.status}</Tag>
            </View>
            <View className="pool-item__row">
              <Text className="pool-item__phone">
                {maskPhone(p.customer.phone)}
              </Text>
              <Text className="pool-item__time">
                {formatDate(p.releasedAt, "YYYY-MM-DD")}
              </Text>
            </View>
            {p.reason ? (
              <View className="pool-item__reason">释放原因：{p.reason}</View>
            ) : null}
            <Button
              className="pool-item__btn"
              onClick={() => openAssign(p._id)}
            >
              分配给销售员
            </Button>
          </View>
        ))
      )}

      <Modal
        visible={assignModal}
        title="分配销售员"
        onClose={() => setAssignModal(false)}
      >
        <Picker
          mode="selector"
          range={users.map((u) => `${u.realName}（${u.username}）`)}
          onChange={(e) =>
            setTargetUserId(users[Number(e.detail.value)]._id || users[Number(e.detail.value)].id)
          }
        >
          <View className="assign-picker">
            {targetUserId
              ? (() => {
                  const u = users.find((x) => (x._id || x.id) === targetUserId);
                  return u ? `${u.realName}（${u.username}）` : "请选择销售员";
                })()
              : "请选择销售员"}
          </View>
        </Picker>
        <Button className="assign-btn" onClick={submitAssign}>
          确认分配
        </Button>
      </Modal>
    </View>
  );
}
