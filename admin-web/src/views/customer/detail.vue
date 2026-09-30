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
              <el-button v-if="!editing" type="primary" size="small" @click="editing = true">
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
            <el-descriptions-item label="手机号">{{ detail.phone || "-" }}</el-descriptions-item>
            <el-descriptions-item label="年龄">{{ detail.age ?? "-" }}</el-descriptions-item>
            <el-descriptions-item label="意向等级">
              <el-select v-if="editing" v-model="detail.intentLevel" size="small">
                <el-option v-for="lv in ['A', 'B', 'C', 'D']" :key="lv" :label="lv" :value="lv" />
              </el-select>
              <span v-else>{{ detail.intentLevel || "-" }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="到访渠道">{{ detail.visitChannelText || "-" }}</el-descriptions-item>
            <el-descriptions-item label="到访时间">{{ detail.visitTime || "-" }}</el-descriptions-item>
            <el-descriptions-item label="归属人">{{ detail.ownerName || "-" }}</el-descriptions-item>
            <el-descriptions-item label="所属项目">{{ detail.projectName || "-" }}</el-descriptions-item>
            <el-descriptions-item label="客户状态">{{ detail.statusText || "-" }}</el-descriptions-item>
            <el-descriptions-item label="最近跟进时间">{{ detail.lastFollowupTime || "-" }}</el-descriptions-item>
            <el-descriptions-item label="备注" :span="2">{{ detail.remark || "-" }}</el-descriptions-item>
          </el-descriptions>

          <div class="photos">
            <div class="section-title">水印照片（项目名 + 时间水印）</div>
            <el-image
              v-for="(url, i) in detail.photos || []"
              :key="i"
              :src="url"
              :preview-src-list="detail.photos"
              fit="cover"
              class="photo"
            />
            <el-empty v-if="!(detail.photos || []).length" description="暂无照片" :image-size="60" />
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：归属调整 + 流转日志 -->
      <el-col :span="10">
        <el-card shadow="never" style="margin-bottom: 16px">
          <template #header>客户归属调整</template>
          <el-space wrap>
            <el-select v-model="assignTo" placeholder="分配给销售员/渠道员" style="width: 200px">
              <el-option label="移入公共池" value="PUBLIC" />
              <!-- TODO: 对接销售员/渠道员账号列表 -->
              <el-option v-for="s in staffOptions" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
            <el-button type="primary" @click="handleAssign">确认调整</el-button>
          </el-space>
        </el-card>

        <el-card shadow="never">
          <template #header>完整流转日志（报备/过期/申领/分配/审批）</template>
          <el-timeline>
            <el-timeline-item
              v-for="log in transferLogs"
              :key="log.id"
              :timestamp="log.time"
              :type="log.type"
            >
              {{ log.content }}
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
        <el-table-column prop="time" label="跟进时间" width="170" />
        <el-table-column prop="wayText" label="跟进方式" width="100" />
        <el-table-column prop="content" label="跟进内容" min-width="220" />
        <el-table-column prop="result" label="跟进结果" min-width="160" />
        <el-table-column prop="operatorName" label="跟进人" width="100" />
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from "vue";
import { useRoute } from "vue-router";
import { ElMessage } from "element-plus";
import request from "@/utils/request";

const route = useRoute();
const loading = ref(false);
const editing = ref(false);
const detail = reactive({});
const backup = ref({});
const followups = ref([]);
const transferLogs = ref([]);
const assignTo = ref("");
const staffOptions = ref([]);

onMounted(async () => {
  loading.value = true;
  try {
    // TODO: 对接 GET /api/admin/customers/:id
    // Object.assign(detail, await request.get(`/admin/customers/${route.params.id}`));
    // 跟进记录 GET /api/admin/followups/{customerId}
    // 流转日志 GET /api/admin/customer/{id}/transfer-log
  } finally {
    loading.value = false;
  }
});

function cancelEdit() {
  Object.assign(detail, backup.value);
  editing.value = false;
}

async function saveEdit() {
  // PUT /api/admin/customer/{id} 强制记录修改人/时间/修改前后值
  await request.put(`/admin/customer/${route.params.id}`, detail);
  ElMessage.success("已保存");
  editing.value = false;
}

async function handleAssign() {
  if (!assignTo.value) return ElMessage.warning("请选择调整目标");
  // POST /api/admin/assign-customer（操作写日志）
  await request.post("/admin/assign-customer", {
    customerId: route.params.id,
    target: assignTo.value,
  });
  ElMessage.success("归属已调整");
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
