<script lang="ts" setup>
import type { WorkflowItem, ProjectPreference } from '#/api/taskmanagement';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, DatePicker, Divider, Input, message, Select, Tag } from 'ant-design-vue';
import dayjs, { Dayjs } from 'dayjs';

import {
  createSchedule,
  updateSchedule,
  previewSchedule,
  getProjectPreference,
  type SchedulePreviewParams,
} from '#/api/taskmanagement';
import { getEnvironmentListApi, type EnvironmentInfo } from '#/api/environment';
import { getAlertGroupsList, type AlertGroupItem } from '#/api/project';
import { useProjectStore } from '#/store';

defineOptions({ name: 'ScheduleModal' });

const projectStore = useProjectStore();

const currentWorkflow = ref<WorkflowItem | null>(null);
const scheduleId = ref<number | null>(null);
const projectPreference = ref<ProjectPreference | null>(null);
const environmentList = ref<EnvironmentInfo[]>([]);
const alertGroupList = ref<AlertGroupItem[]>([]);
const schedulePreview = ref<string[]>([]);
const loading = ref(false);
const previewLoading = ref(false);

const startTime = ref<Dayjs>(dayjs().startOf('day'));
const endTime = ref<Dayjs>(dayjs().add(100, 'year').endOf('day'));
const crontab = ref('0 0 * * * ? *');
const timezoneId = ref('Asia/Shanghai');

const warningType = ref('NONE');
const workflowInstancePriority = ref('MEDIUM');
const workerGroup = ref('default');
const environmentCode = ref<number | undefined>();
const warningGroupId = ref<number | undefined>();
const queue = ref('');

const timezoneOptions = [
  { label: 'Asia/Shanghai (北京时间)', value: 'Asia/Shanghai' },
  { label: 'Asia/Tokyo (东京时间)', value: 'Asia/Tokyo' },
  { label: 'America/New_York (纽约时间)', value: 'America/New_York' },
  { label: 'Europe/London (伦敦时间)', value: 'Europe/London' },
];

const warningTypeOptions = [
  { label: '都不发', value: 'NONE' },
  { label: '成功发', value: 'SUCCESS' },
  { label: '失败发', value: 'FAILURE' },
  { label: '成功或失败都发', value: 'ALL' },
];

const priorityOptions = [
  { label: 'HIGHEST', value: 'HIGHEST' },
  { label: 'HIGH', value: 'HIGH' },
  { label: 'MEDIUM', value: 'MEDIUM' },
  { label: 'LOW', value: 'LOW' },
  { label: 'LOWEST', value: 'LOWEST' },
];

const cronPresets = [
  { label: '每小时', value: '0 0 * * * ? *' },
  { label: '每天零点', value: '0 0 0 * * ? *' },
  { label: '每天中午12点', value: '0 0 12 * * ? *' },
  { label: '每周一零点', value: '0 0 0 ? * MON *' },
  { label: '每月1号零点', value: '0 0 0 1 * ? *' },
];

const workerGroupOptions = computed(() => {
  const env = environmentList.value.find(e => e.code === environmentCode.value);
  if (env && env.workerGroups) {
    return env.workerGroups.map(g => ({ label: g, value: g }));
  }
  return [{ label: 'default', value: 'default' }];
});

const environmentOptions = computed(() => {
  return environmentList.value.map(e => ({
    label: e.name,
    value: e.code,
  }));
});

const alertGroupOptions = computed(() => {
  return alertGroupList.value.map(g => ({
    label: g.groupName,
    value: g.id,
  }));
});

const workflowTitle = computed(() => currentWorkflow.value?.name || '');

function getScheduleParams(): SchedulePreviewParams {
  return {
    startTime: startTime.value.format('YYYY-MM-DD HH:mm:ss'),
    endTime: endTime.value.format('YYYY-MM-DD HH:mm:ss'),
    crontab: crontab.value,
    timezoneId: timezoneId.value,
  };
}

async function loadData() {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) return;

  try {
    const [preference, envs, alertGroups] = await Promise.all([
      getProjectPreference(projectCode),
      getEnvironmentListApi(),
      getAlertGroupsList(),
    ]);
    
    projectPreference.value = preference;
    environmentList.value = envs || [];
    alertGroupList.value = alertGroups || [];
    
    if (preference) {
      workerGroup.value = preference.workerGroup || 'default';
      environmentCode.value = preference.environmentCode;
      warningGroupId.value = preference.warningGroupId;
      queue.value = preference.queue || '';
    }
    
    if (envs && envs.length > 0 && !environmentCode.value) {
      environmentCode.value = envs[0].code;
    }
  } catch {
    message.error('加载配置失败');
  }
}

async function handlePreview() {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  
  previewLoading.value = true;
  try {
    const result = await previewSchedule(projectCode, getScheduleParams());
    schedulePreview.value = result || [];
    message.success('预览成功');
  } catch {
    message.error('预览失败');
    schedulePreview.value = [];
  } finally {
    previewLoading.value = false;
  }
}

async function handleConfirm() {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  
  if (!currentWorkflow.value) {
    message.error('工作流信息缺失');
    return;
  }

  if (currentWorkflow.value.releaseState !== 'ONLINE') {
    message.error('当前任务未上线');
    return;
  }

  modalApi.lock();
  loading.value = true;
  try {
    const params = {
      schedule: getScheduleParams(),
      failureStrategy: 'CONTINUE',
      warningType: warningType.value,
      workflowInstancePriority: workflowInstancePriority.value,
      warningGroupId: warningGroupId.value || 1,
      workerGroup: workerGroup.value,
      tenantCode: projectPreference.value?.tenantCode || '',
      environmentCode: environmentCode.value || 0,
      workflowDefinitionCode: currentWorkflow.value.code,
    };
    
    if (scheduleId.value != null && scheduleId.value > 0) {
      await updateSchedule(projectCode, scheduleId.value, params);
      message.success('定时任务更新成功');
    } else {
      await createSchedule(projectCode, params);
      message.success('定时任务创建成功');
    }
    modalApi.close();
  } catch {
    message.error(scheduleId.value ? '更新定时任务失败' : '创建定时任务失败');
    modalApi.unlock();
  } finally {
    loading.value = false;
  }
}

const [Modal, modalApi] = useVbenModal({
  fullscreenButton: false,
  onCancel() {
    modalApi.close();
  },
  onConfirm: handleConfirm,
  title: '定时设置',
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<WorkflowItem>();
      currentWorkflow.value = data || null;
      schedulePreview.value = [];
      scheduleId.value = data?.schedule?.id || null;
      loadData();
    }
  },
});
</script>

<template>
  <Modal class="w-[700px]" :confirm-loading="loading">
    <div class="space-y-4">
      <div v-if="currentWorkflow" class="workflow-info">
        <span class="label">工作流：</span>
        <Tag color="blue">{{ currentWorkflow.name }}</Tag>
      </div>


      <div class="form-row">
        <div class="form-item">
          <label class="form-label">开始时间</label>
          <DatePicker
            v-model:value="startTime"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </div>
        <div class="form-item">
          <label class="form-label">结束时间</label>
          <DatePicker
            v-model:value="endTime"
            show-time
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-item">
          <label class="form-label">时区</label>
          <Select v-model:value="timezoneId" :options="timezoneOptions" style="width: 100%" />
        </div>
      </div>


      <div class="form-row">
        <div class="form-item" style="flex: 2">
          <label class="form-label">Cron表达式</label>
          <Input v-model:value="crontab" placeholder="请输入Cron表达式" />
        </div>
        <div class="form-item" style="flex: 1">
          <label class="form-label">快捷选择</label>
          <Select
            :value="undefined"
            placeholder="选择预设"
            style="width: 100%"
            @change="(val: string) => val && (crontab = val)"
          >
            <Select.Option v-for="preset in cronPresets" :key="preset.value" :value="preset.value">
              {{ preset.label }}
            </Select.Option>
          </Select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-item">
          <label class="form-label">执行时间预览</label>
          <Button type="primary" ghost :loading="previewLoading" @click="handlePreview">
            预览
          </Button>
        </div>
        <div class="form-item" v-if="schedulePreview.length > 0">
          <label class="form-label">接下来5次执行时间</label>
          <div class="preview-list">
            <Tag v-for="(time, index) in schedulePreview.slice(0, 5)" :key="index" color="green">
              {{ time }}
            </Tag>
          </div>
        </div>
      </div>


      <div class="form-row">
        <div class="form-item">
          <label class="form-label">通知策略</label>
          <Select v-model:value="warningType" :options="warningTypeOptions" style="width: 100%" />
        </div>
        <div class="form-item">
          <label class="form-label">任务优先级</label>
          <Select v-model:value="workflowInstancePriority" :options="priorityOptions" style="width: 100%" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-item">
          <label class="form-label">Worker分组</label>
          <Select v-model:value="workerGroup" :options="workerGroupOptions" placeholder="请选择Worker分组" style="width: 100%" />
        </div>
        <div class="form-item">
          <label class="form-label">环境名称</label>
          <Select v-model:value="environmentCode" :options="environmentOptions" placeholder="请选择环境" style="width: 100%" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-item">
          <label class="form-label">告警组</label>
          <Select v-model:value="warningGroupId" :options="alertGroupOptions" placeholder="请选择告警组" style="width: 100%" />
        </div>
        <div class="form-item">
          <label class="form-label">队列名</label>
          <Input v-model:value="queue" placeholder="请输入队列名" />
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.workflow-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 6px;
}

.label {
  color: rgba(0, 0, 0, 0.65);
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-item {
  flex: 1;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.85);
}

.preview-section {
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.preview-result {
  margin-top: 12px;
}

.preview-title {
  margin-bottom: 8px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
}

.preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
