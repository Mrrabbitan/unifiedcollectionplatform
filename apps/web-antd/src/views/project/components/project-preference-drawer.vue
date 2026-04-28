<script lang="ts" setup>
import type {
  AlertGroupItem,
  EnvironmentItem,
  ProjectPreference,
  ProjectPreferenceResponse,
  TenantItem,
} from '#/api/project';

import { computed, reactive, ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  Form,
  InputNumber,
  message,
  Select,
  Spin,
  Switch,
} from 'ant-design-vue';

import {
  getAlertGroupsList,
  getEnvironmentList,
  getProjectPreference,
  getProjectWorkerGroupsForPreference,
  getTenantsList,
  toggleProjectPreferenceState,
  updateProjectPreference,
} from '#/api/project';

defineOptions({ name: 'ProjectPreferenceDrawer' });

const emit = defineEmits<{
  success: [];
}>();

const [Drawer, drawerApi] = useVbenDrawer({
  onConfirm: handleSubmit,
  onOpenChange: handleOpenChange,
});

const projectCode = ref<number>(0);
const projectName = ref('');
const loading = ref(false);
const saving = ref(false);
const enabled = ref(false);

const formState = reactive<ProjectPreference>({
  taskPriority: 'MEDIUM',
  workerGroup: '',
  environmentCode: undefined,
  failRetryTimes: 0,
  failRetryInterval: 1,
  cpuQuota: -1,
  memoryMax: -1,
  warningType: 'NONE',
  tenant: undefined,
  alertGroups: undefined,
});

const taskPriorityOptions = [
  { value: 'HIGHEST', label: '最高' },
  { value: 'HIGH', label: '高' },
  { value: 'MEDIUM', label: '中' },
  { value: 'LOW', label: '低' },
  { value: 'LOWEST', label: '最低' },
];

const notifyStrategyOptions = [
  { value: 'NONE', label: '都不发' },
  { value: 'SUCCESS', label: '成功发' },
  { value: 'FAILURE', label: '失败发' },
  { value: 'ALL', label: '成功或失败都发' },
];

const tenants = ref<TenantItem[]>([]);
const workerGroups = ref<string[]>([]);
const environments = ref<EnvironmentItem[]>([]);
const alertGroups = ref<AlertGroupItem[]>([]);

const filteredEnvironments = computed(() => {
  if (!formState.workerGroup) {
    return [];
  }
  return environments.value.filter((e) => {
    if (!e.workerGroups || !Array.isArray(e.workerGroups)) {
      return false;
    }
    return e.workerGroups.includes(formState.workerGroup);
  });
});

async function handleOpenChange(isOpen: boolean) {
  if (isOpen) {
    const data = drawerApi.getData<{
      projectCode: number;
      projectName: string;
    }>();
    projectCode.value = data?.projectCode || 0;
    projectName.value = data?.projectName || '';
    await fetchAllData();
    await fetchPreference();
  }
}

async function fetchAllData() {
  try {
    const [tenantsRes, workerGroupsRes, environmentsRes, alertGroupsRes] =
      await Promise.all([
        getTenantsList(),
        getProjectWorkerGroupsForPreference(projectCode.value),
        getEnvironmentList(),
        getAlertGroupsList(),
      ]);

    tenants.value = tenantsRes || [];
    workerGroups.value = (workerGroupsRes || []).map((w) => w.workerGroup);
    environments.value = environmentsRes || [];
    alertGroups.value = alertGroupsRes || [];
  } catch {
    message.error('获取配置数据失败');
  }
}

async function fetchPreference() {
  loading.value = true;
  try {
    const res = await getProjectPreference(projectCode.value);
    if (res.preferences) {
      const preferences = JSON.parse(res.preferences);
      Object.assign(formState, preferences);
    }
    enabled.value = res.state === 1;
    drawerApi.setState({ showConfirmButton: res.state === 1 });
  } catch {
    enabled.value = false;
    drawerApi.setState({ showConfirmButton: false });
  } finally {
    loading.value = false;
  }
}

async function handleToggleEnabled(checked: boolean) {
  enabled.value = checked;
  try {
    await toggleProjectPreferenceState(projectCode.value, enabled.value ? 1 : 0);
    message.success(enabled.value ? '已启用' : '已禁用');
    drawerApi.setState({ showConfirmButton: checked });
  } catch {
    message.error('操作失败');
    enabled.value = !checked;
  }
}

async function handleSubmit() {
  if (!enabled.value) {
    message.warning('请先启用项目偏好设置');
    return;
  }
  saving.value = true;
  try {
    const submitData = {
      taskPriority: formState.taskPriority,
      workerGroup: formState.workerGroup,
      environmentCode: formState.environmentCode,
      failRetryTimes: formState.failRetryTimes,
      failRetryInterval: formState.failRetryInterval,
      cpuQuota: formState.cpuQuota,
      memoryMax: formState.memoryMax,
      warningType: formState.warningType,
      tenant: formState.tenant,
      alertGroups: formState.alertGroups,
    };
    await updateProjectPreference(projectCode.value, submitData);
    message.success('保存成功');
    drawerApi.close();
    emit('success');
  } catch {
    message.error('保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Drawer :title="`项目偏好设置 - ${projectName}`" class="w-[600px]">
    <Spin :spinning="loading">
      <div class="p-4">
        <div class="mb-4 flex items-center justify-between">
          <div class="text-gray-500">
            {{ enabled ? '当前是启用状态' : '当前是禁用状态' }}
          </div>
          <div class="flex items-center gap-2">
            <span>{{ enabled ? '已启用' : '已禁用' }}</span>
            <Switch
              :checked="enabled"
              @change="handleToggleEnabled"
            />
          </div>
        </div>

        <Form layout="vertical">
          <Form.Item label="任务优先级">
            <Select
              v-model:value="formState.taskPriority"
              :options="taskPriorityOptions"
              placeholder="请选择任务优先级"
            />
          </Form.Item>

          <Form.Item label="租户">
            <Select
              v-model:value="formState.tenant"
              :options="tenants.map((t) => ({ value: t.tenantCode, label: t.tenantCode }))"
              placeholder="请选择租户"
              allow-clear
            />
          </Form.Item>

          <Form.Item label="Worker分组">
            <Select
              v-model:value="formState.workerGroup"
              :options="workerGroups.map((w) => ({ value: w, label: w }))"
              placeholder="请选择Worker分组"
              allow-clear
              @change="formState.environmentCode = undefined"
            />
          </Form.Item>

          <Form.Item label="环境名称">
            <Select
              v-model:value="formState.environmentCode"
              :options="filteredEnvironments.map((e) => ({ value: e.code, label: e.name }))"
              :placeholder="formState.workerGroup ? '请选择环境名称' : '请先选择Worker分组'"
              :disabled="!formState.workerGroup"
              allow-clear
            />
          </Form.Item>

          <Form.Item label="失败重试次数">
            <div class="flex items-center">
              <InputNumber
                v-model:value="formState.failRetryTimes"
                :min="0"
                :precision="0"
                class="flex-1"
              />
              <span class="ml-2">次</span>
            </div>
          </Form.Item>

          <Form.Item label="失败重试间隔">
            <div class="flex items-center">
              <InputNumber
                v-model:value="formState.failRetryInterval"
                :min="1"
                :precision="0"
                class="flex-1"
              />
              <span class="ml-2">分钟</span>
            </div>
          </Form.Item>

          <Form.Item label="通知策略">
            <Select
              v-model:value="formState.warningType"
              :options="notifyStrategyOptions"
              placeholder="请选择通知策略"
            />
          </Form.Item>

          <Form.Item label="告警组">
            <Select
              v-model:value="formState.alertGroups"
              :options="alertGroups.map((a) => ({ value: a.id, label: a.groupName }))"
              placeholder="请选择告警组"
              allow-clear
            />
          </Form.Item>

          <Form.Item label="CPU配额">
            <div class="flex items-center">
              <InputNumber
                v-model:value="formState.cpuQuota"
                :min="-1"
                :precision="0"
                class="flex-1"
              />
              <span class="ml-2">%</span>
            </div>
          </Form.Item>

          <Form.Item label="最大内存">
            <div class="flex items-center">
              <InputNumber
                v-model:value="formState.memoryMax"
                :min="-1"
                :precision="0"
                class="flex-1"
              />
              <span class="ml-2">MB</span>
            </div>
          </Form.Item>
        </Form>
      </div>
    </Spin>
  </Drawer>
</template>
