<template>
  <div v-loading="loading">
    <el-page-header content="客户详情" style="margin-bottom: 16px" @back="$router.back()" />

    <el-row :gutter="16">
      <!-- 左侧：基础信息 + 水印照片 -->
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>基础信息</span>
              <el-button v-if="!editing" type="primary" size="small" @click="startEdit">
                编辑
              </el-button>
              <span v-else>
                <el-button type="primary" size="small" @click="saveEdit">保存</el-button>
                <el-button size="small" @click="cancelEdit">取消</el-button>
              </span>
            </div>
          </template>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="姓名">
              <el-input v-if="editing" v-model="detail.name" size="small" />
              <span v-else>{{ detail.name || "-" }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="手机号">
              <el-input v-if="editing" v-model="detail.phone" size="small" maxlength="11" />
              <span v-else>{{ detail.phone || "-" }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="年龄">
              <el-input-number v-if="editing" v-model="detail.age" size="small" :min="1" :max="120" />
              <span v-else>{{ detail.age ?? "-" }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="意向等级">
              <el-select v-if="editing" v-model="detail.intentLevel" size="small">
                <el-option v-for="(text, key) in INTENT_TEXT" :key="key" :label="text" :value="key" />
              </el-select>
              <span v-else>{{ INTENT_TEXT[detail.intentLevel] || detail.intentLevel || "-" }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="到访渠道">{{ SOURCE_TEXT[detail.source] || detail.source || "-" }}</el-descriptions-item>
            <el-descriptions-item label="到访时间">{{ fmtTime(detail.visitTime) }}</el-descriptions-item>
            <el-descriptions-item label="归属人">{{ userName(detail.owner) || "-" }}</el-descriptions-item>
            <el-descriptions-item label="渠道员">{{ userName(detail.channelUser) || "-" }}</el-descriptions-item>
            <el-descriptions-item label="所属项目">{{ detail.projectId?.name || "-" }}</el-descriptions-item>
            <el-descriptions-item label="客户状态">{{ STATUS_TEXT[detail.status] || detail.status || "-" }}</el-descriptions-item>
            <el-descriptions-item label="最近跟进时间">{{ fmtTime(detail.lastFollowupAt) }}</el-descriptions-item>
            <el-descriptions-item label="跟进次数">{{ detail.followupCount ?? 0 }}</el-descriptions-item>
            <el-descriptions-item label="合作公司">{{ detail.company?.name || "-" }}</el-descriptions-item>
            <el-descriptions-item label="推荐人">{{ detail.referrerName || "-" }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">
              <el-input v-if="editing" v-model="detail.remark" type="textarea" :rows="3" />
              <span v-else>{{ detail.remark || "-" }}</span>
            </el-descriptions-item>
          </el-descriptions>

          <div class="photos">
            <div class="section-title">水印照片（项目名 + 时间水印）</div>
            <el-image
              v-for="(url, i) in detail.visitPhotos || []"
              :key="i"
              :src="url"
              :preview-src-list="detail.visitPhotos"
              fit="cover"
              class="photo"
            />
            <el-empty v-if="!(detail.visitPhotos || []).length" description="暂无照片" :image-size="60" />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：归属调整 + 流转日志 -->
      <el-col :span="10">
        <el-card shadow="never" style="margin-bottom: 16px">
          <template #header>客户归属调整</template>
          <el-space wrap>
            <el-select v-model="assignTo" filterable placeholder="分配给销售员/渠道员" style="width: 200px">
              <el-option v-for="s in staffOptions" :key="s._id" :label="userName(s)" :value="s._id" />
            </el-select>
            <el-button type="primary" @click="handleAssign">确认调整</el-button>
            <el-button type="warning" @click="handleMoveToPublic">移入公共池</el-button>
          </el-space>
        </el-card>

        <el-card shadow="never">
          <template #header>完整流转日志（报备/过期/申领/分配/审批）</template>
          <el-timeline>
            <el-timeline-item
              v-for="log in transferLogs"
              :key="log._id"
              :timestamp="fmtTime(log.createdAt)"
              :type="TRANSFER_TAG[log.action] || 'info'"
            >
              {{ transferText(log) }}
            </el-timeline-item>
          </el-timeline>
          <el-empty v-if="!transferLogs.length" description="暂无流转记录" :image-size="60" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 跟进记录 -->
    <el-card shadow="never" style="margin-top: 16px">
      <template #header>跟进记录</template>
      <el-table :data="followups" border stripe>
        <el-table-column label="跟进时间" width="170">
          <template #default="{ row }">{{ fmtTime(row.followupTime) }}</template>
        </el-table-column>
        <el-table-column label="跟进方式" width="100">
          <template #default="{ row }">{{ METHOD_TEXT[row.method] || row.method || "-" }}</template>
        </el-table-column>
        <el-table-column prop="content" label="跟进内容" min-width="220" />
        <el-table-column prop="result" label="跟进结果" min-width="160">
          <template #default="{ row }">{{ row.result || "-" }}</template>
        </el-table-column>
        <el-table-column label="跟进人" width="100">
          <template #default="{ row }">{{ userName(row.operator) || row.operatorName || "-" }}</template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!followups.length" description="暂无跟进记录" :image-size="60" />
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import request from "@/utils/request";

// 枚举中文映射（与客户列表页保持一致）
const SOURCE_TEXT = {
  SELF_VISIT: "自访",
  SELF_DEVELOP: "自拓",
  CHANNEL_COMPANY: "渠道公司推荐",
  PERSONAL_REFERRAL: "个人推荐",
};
const INTENT_TEXT = { HIGH: "高意向", MEDIUM: "中意向", LOW: "低意向", NONE: "无意向" };
const STATUS_TEXT = {
  ACTIVE: "跟进中",
  DEAL: "已成交",
  PUBLIC_POOL: "公共池",
  EXPIRED: "已过期",
  UNVISITED: "未到访",
};
const METHOD_TEXT = { PHONE: "电话", WECHAT: "微信", FACE: "面谈" };
const TRANSFER_TEXT = {
  ASSIGN: "分配",
  MOVE_PUBLIC: "移入公共池",
  CLAIM: "认领",
  EXPIRE: "渠道过期",
  RE_REPORT: "重新报备",
  APPROVE: "审批通过",
  ARRIVE: "到访确认",
  CONFLICT_APPROVED: "冲突审批通过",
};
const TRANSFER_TAG = {
  ASSIGN: "success",
  MOVE_PUBLIC: "warning",
  EXPIRE: "danger",
  CLAIM: "primary",
  APPROVE: "success",
};

function fmtTime(t) {
  return t ? new Date(t).toLocaleString("zh-CN", { hour12: false }) : "-";
}
function userName(u) {
  return u?.realName || u?.username || "";
}
function transferText(log) {
  const from = log.fromUserName || userName(log.fromUser) || "—";
  const to = log.toUserName || userName(log.toUser) || "—";
  const action = TRANSFER_TEXT[log.action] || log.action;
  return `${action}：${from} → ${to}${log.reason ? `（${log.reason}）` : ""}`;
}

const route = useRoute();
const loading = ref(false);
const editing = ref(false);
const detail = reactive({});
const backup = ref({});
const followups = ref([]);
const transferLogs = ref([]);
const assignTo = ref("");
const staffOptions = ref([]);

async function loadAll() {
  loading.value = true;
  try {
    // GET /api/admin/customer/:id → 客户详情（含 owner/channelUser/company/projectId populate，管理员可见全号）
    const data = await request.get(`/admin/customer/${route.params.id}`);
    Object.keys(detail).forEach((k) => delete detail[k]);
    Object.assign(detail, data);
    // 跟进记录 GET /api/admin/followups/:customerId
    followups.value = (await request.get(`/admin/followups/${route.params.id}`)) || [];
    // 流转日志 GET /api/admin/customer/:id/transfer-log
    transferLogs.value = (await request.get(`/admin/customer/${route.params.id}/transfer-log`)) || [];
  } finally {
    loading.value = false;
  }
}

async function loadStaff() {
  // GET /api/admin/users → 归属调整下拉（销售员/渠道员）
  try {
    const users = await request.get("/admin/users", { params: { pageSize: 100 } });
    staffOptions.value = (users || []).filter((u) => u.role !== "ROLE_ADMIN");
  } catch {
    staffOptions.value = [];
  }
}

onMounted(() => {
  loadAll();
  loadStaff();
});

const EDITABLE_KEYS = ["name", "phone", "age", "intentLevel", "remark"];

function startEdit() {
  backup.value = JSON.parse(JSON.stringify(Object.fromEntries(EDITABLE_KEYS.map((k) => [k, detail[k] ?? ""]))));
  editing.value = true;
}

function cancelEdit() {
  Object.assign(detail, backup.value);
  editing.value = false;
}

async function saveEdit() {
  // PUT /api/admin/customer/:id（后端强制记录修改人/时间/修改前后值）
  await request.put(`/admin/customer/${route.params.id}`, {
    name: detail.name,
    phone: detail.phone,
    rawPhone: detail.phone,
    age: detail.age,
    intentLevel: detail.intentLevel,
    remark: detail.remark,
  });
  ElMessage.success("已保存");
  editing.value = false;
  loadAll();
}

async function handleAssign() {
  if (!assignTo.value) return ElMessage.warning("请选择调整目标");
  const ok = await ElMessageBox.confirm("确认将该客户分配给所选人员？", "归属调整", { type: "warning" }).catch(() => false);
  if (!ok) return;
  // POST /api/admin/assign-customer（操作写流转日志与审计日志）
  const res = await request.post("/admin/assign-customer", {
    customerId: route.params.id,
    targetUserId: assignTo.value,
  });
  ElMessage.success(res?.message || "归属已调整");
  assignTo.value = "";
  loadAll();
}

async function handleMoveToPublic() {
  const ok = await ElMessageBox.confirm("确认将该客户移入公共池？", "移入公共池", { type: "warning" }).catch(() => false);
  if (!ok) return;
  const res = await request.post("/admin/assign-customer", {
    customerId: route.params.id,
    moveToPublicPool: true,
  });
  ElMessage.success(res?.message || "已移入公共池");
  loadAll();
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section-title {
  font-weight: 500;
  margin: 16px 0 8px;
}
.photos {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.photo {
  width: 120px;
  height: 120px;
  border-radius: 6px;
}
</style>
