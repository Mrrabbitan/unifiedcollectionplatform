<script lang="ts" setup>
import type { WorkflowItem, GlobalParam, WorkflowDetail, ProjectPreference } from '#/api/taskmanagement';

import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Divider, Input, message, Select, Table } from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  getWorkflowDetail,
  getProjectPreference,
  startWorkflow,
} from '#/api/taskmanagement';
import { getEnvironmentListApi, type EnvironmentInfo } from '#/api/environment';
import { getAlertGroupsList, type AlertGroupItem } from '#/api/project';
import { useProjectStore } from '#/store';

defineOptions({ name: 'StartModal' });

const projectStore = useProjectStore();

const currentWorkflow = ref<WorkflowItem | null>(null);
const workflowDetail = ref<WorkflowDetail | null>(null);
const projectPreference = ref<ProjectPreference | null>(null);
const environmentList = ref<EnvironmentInfo[]>([]);
const alertGroupList = ref<AlertGroupItem[]>([]);
const loading = ref(false);

const warningType = ref('NONE');
const workflowInstancePriority = ref('MEDIUM');
const workerGroup = ref('default');
const environmentCode = ref<number | undefined>();
const warningGroupId = ref<number | undefined>();
const queue = ref('');
const startParams = ref<GlobalParam[]>([]);

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

const paramColumns = [
  {
    title: '参数名',
    dataIndex: 'prop',
    width: 120,
  },
  {
    title: '类型',
    dataIndex: 'type',
    width: 100,
  },
  {
    title: '参数值',
    dataIndex: 'value',
    width: 200,
  },
];

const workflowTitle = computed(() => currentWorkflow.value?.name || '');

async function loadData() {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode || !currentWorkflow.value) return;

  loading.value = true;
  try {
    const [detail, preference, envs, alertGroups] = await Promise.all([
      getWorkflowDetail(projectCode, currentWorkflow.value.code),
      getProjectPreference(projectCode),
      getEnvironmentListApi(),
      getAlertGroupsList(),
    ]);
    
    workflowDetail.value = detail;
    projectPreference.value = preference;
    environmentList.value = envs || [];
    alertGroupList.value = alertGroups || [];
    
    if (detail.globalParamList && detail.globalParamList.length > 0) {
      startParams.value = detail.globalParamList.map(p => ({
        prop: p.prop,
        direct: p.direct || 'IN',
        type: p.type || 'VARCHAR',
        value: p.value || '',
      }));
    }
    
    if (preference) {
      if (preference.taskPriority) {
        workflowInstancePriority.value = preference.taskPriority;
      }
      if (preference.workerGroup) {
        workerGroup.value = preference.workerGroup;
      }
      if (preference.environmentCode) {
        environmentCode.value = preference.environmentCode;
      }
      if (preference.warningType) {
        warningType.value = preference.warningType;
      }
      if (preference.alertGroups) {
        warningGroupId.value = preference.alertGroups;
      }
    }
    
    if (envs && envs.length > 0 && !environmentCode.value) {
      environmentCode.value = envs[0].code;
    }
  } catch {
    message.error('加载数据失败');
  } finally {
    loading.value = false;
  }
}

watch(environmentCode, () => {
  const env = environmentList.value.find(e => e.code === environmentCode.value);
  if (env && env.workerGroups && env.workerGroups.length > 0) {
    if (!env.workerGroups.includes(workerGroup.value)) {
      workerGroup.value = env.workerGroups[0];
    }
  }
});

async function handleConfirm() {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  
  if (!currentWorkflow.value || !workflowDetail.value) {
    message.error('工作流信息缺失');
    return;
  }

  modalApi.lock();
  loading.value = true;
  try {
    const today = dayjs().format('YYYY-MM-DD');
    await startWorkflow(projectCode, {
      workflowDefinitionCode: currentWorkflow.value.code,
      failureStrategy: 'CONTINUE',
      warningType: warningType.value,
      warningGroupId: warningGroupId.value || 1,
      execType: 'START_PROCESS',
      startNodeList: '',
      taskDependType: 'TASK_POST',
      complementDependentMode: 'OFF_MODE',
      runMode: 'RUN_MODE_SERIAL',
      workflowInstancePriority: workflowInstancePriority.value,
      workerGroup: workerGroup.value,
      tenantCode: projectPreference.value?.tenant || '',
      environmentCode: environmentCode.value || 0,
      startParams: startParams.value,
      expectedParallelismNumber: 2,
      dryRun: 0,
      version: workflowDetail.value.version,
      allLevelDependent: false,
      executionOrder: 'DESC_ORDER',
      scheduleTime: {
        complementStartDate: `${today} 00:00:00`,
        complementEndDate: `${today} 00:00:00`,
      },
    });
    message.success('任务启动成功');
    modalApi.close();
  } catch {
    message.error('任务启动失败');
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
  title: '启动前请先设置参数',
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<WorkflowItem>();
      currentWorkflow.value = data || null;
      workflowDetail.value = null;
      projectPreference.value = null;
      startParams.value = [];
      if (data) {
        loadData();
      }
    }
  },
});
</script>

<template>
  <Modal class="w-[600px]" :confirm-loading="loading">
    <div v-if="loading && !workflowDetail" class="loading-container">
      加载中...
    </div>
    <div v-else class="space-y-4">
      <div v-if="currentWorkflow" class="workflow-info">
        <span class="label">工作流：</span>
        <span class="value">{{ currentWorkflow.name }}</span>
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

      <template v-if="startParams.length > 0">
        <Divider orientation="left">参数设置</Divider>
        <Table
          :columns="paramColumns"
          :data-source="startParams"
          :pagination="false"
          size="small"
          row-key="prop"
        >
          <template #bodyCell="{ column, record, index }">
            <template v-if="column.dataIndex === 'value'">
              <Input v-model:value="startParams[index].value" placeholder="请输入参数值" />
            </template>
          </template>
        </Table>
      </template>
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

.value {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
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

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  color: rgba(0, 0, 0, 0.45);
}
</style>
