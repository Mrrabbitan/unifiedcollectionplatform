<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';

import {
  Button,
  Card,
  Checkbox,
  Form,
  FormItem,
  Input,
  InputNumber,
  Select,
  Switch,
} from 'ant-design-vue';
import { Plus, Trash } from '@vben/icons';

import { getDataSourceList } from '#/api/datasource/datasource';
import type { DataSourceInfo } from '#/api/datasource/datasource';

interface CustomParam {
  prop: string;
  direct: 'IN' | 'OUT';
  type: string;
  value: string;
}

const props = defineProps<{
  value?: any;
  disabled?: boolean;
  availableNodes?: { code: number; name: string }[];
  currentNodeCode?: number;
  preTasks?: number[];
}>();

const emit = defineEmits<{
  'update:value': [value: any];
  'update:preTasks': [preTasks: number[]];
}>();

const formData = ref({
  name: '',
  description: '',
  timeoutFlag: false,
  timeoutNotifyStrategy: ['WARN'] as string[],
  timeout: 30,
  type: 'SSH',
  datasource: undefined as number | undefined,
  rawScript: '',
  localParams: [] as CustomParam[],
});

const selectedPreTasks = ref<number[]>([]);
const dataSourceList = ref<DataSourceInfo[]>([]);
const loading = ref(false);

const directOptions = [
  { label: 'IN', value: 'IN' },
  { label: 'OUT', value: 'OUT' },
];

const typeOptions = [
  { label: 'VARCHAR', value: 'VARCHAR' },
  { label: 'INTEGER', value: 'INTEGER' },
  { label: 'LONG', value: 'LONG' },
  { label: 'FLOAT', value: 'FLOAT' },
  { label: 'DOUBLE', value: 'DOUBLE' },
  { label: 'DATE', value: 'DATE' },
  { label: 'TIME', value: 'TIME' },
  { label: 'TIMESTAMP', value: 'TIMESTAMP' },
];

const timeoutStrategyOptions = [
  { label: '超时告警', value: 'WARN' },
  { label: '超时失败', value: 'FAILED' },
];

const dataSourceInstanceOptions = computed(() => {
  return dataSourceList.value.map((item) => ({
    label: item.name,
    value: item.id,
  }));
});

const preTaskOptions = computed(() => {
  return (props.availableNodes || [])
    .filter((node) => node.code !== props.currentNodeCode)
    .map((node) => ({
      label: node.name,
      value: node.code,
    }));
});

function handlePreTasksChange(values: number[]) {
  selectedPreTasks.value = values;
  emit('update:preTasks', values);
}

async function fetchDataSourceList() {
  if (!formData.value.type) return;
  
  loading.value = true;
  try {
    const data = await getDataSourceList(formData.value.type);
    dataSourceList.value = data || [];
  } catch (error) {
    console.error('Failed to fetch datasource list:', error);
    dataSourceList.value = [];
  } finally {
    loading.value = false;
  }
}

function addCustomParam() {
  formData.value.localParams.push({
    prop: '',
    direct: 'IN',
    type: 'VARCHAR',
    value: '',
  });
  emitUpdate();
}

function removeCustomParam(index: number) {
  formData.value.localParams.splice(index, 1);
  emitUpdate();
}

function emitUpdate() {
  emit('update:value', {
    name: formData.value.name,
    description: formData.value.description,
    timeoutFlag: formData.value.timeoutFlag ? 'OPEN' : 'CLOSE',
    timeoutNotifyStrategy: formData.value.timeoutNotifyStrategy,
    timeout: formData.value.timeout,
    type: formData.value.type,
    datasource: formData.value.datasource,
    rawScript: formData.value.rawScript,
    localParams: formData.value.localParams,
  });
}

watch(
  () => props.value,
  (val) => {
    if (val) {
      formData.value = {
        name: val.name || '',
        description: val.description || '',
        timeoutFlag: val.timeoutFlag === 'OPEN',
        timeoutNotifyStrategy: val.timeoutNotifyStrategy || ['WARN'],
        timeout: val.timeout || 30,
        type: val.type || 'SSH',
        datasource: val.datasource,
        rawScript: val.rawScript || '',
        localParams: val.localParams || [],
      };
      fetchDataSourceList();
    }
  },
  { immediate: true }
);

watch(
  () => props.preTasks,
  (val) => {
    if (val) {
      selectedPreTasks.value = [...val];
    }
  },
  { immediate: true }
);

onMounted(() => {
  fetchDataSourceList();
});
</script>

<template>
  <div class="remoteshell-task-form">
    <Card title="基本信息" :bordered="false" class="form-card">
      <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <FormItem label="节点名称" required>
          <Input
            v-model:value="formData.name"
            placeholder="请输入节点名称"
            :disabled="disabled"
            @change="emitUpdate"
          />
        </FormItem>

        <FormItem label="描述">
          <Input.TextArea
            v-model:value="formData.description"
            placeholder="请输入描述"
            :rows="3"
            :disabled="disabled"
            @change="emitUpdate"
          />
        </FormItem>
      </Form>
    </Card>

    <Card title="超时设置" :bordered="false" class="form-card">
      <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <FormItem label="超时告警">
          <Switch
            v-model:checked="formData.timeoutFlag"
            :disabled="disabled"
            @change="emitUpdate"
          />
        </FormItem>

        <template v-if="formData.timeoutFlag">
          <FormItem label="超时策略">
            <Checkbox.Group
              v-model:value="formData.timeoutNotifyStrategy"
              :disabled="disabled"
              @change="emitUpdate"
            >
              <Checkbox
                v-for="opt in timeoutStrategyOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </Checkbox>
            </Checkbox.Group>
          </FormItem>

          <FormItem label="超时时间">
            <InputNumber
              v-model:value="formData.timeout"
              :min="1"
              :disabled="disabled"
              addon-after="分钟"
              style="width: 200px"
              @change="emitUpdate"
            />
          </FormItem>
        </template>
      </Form>
    </Card>

    <Card title="数据源配置" :bordered="false" class="form-card">
      <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <FormItem label="数据源实例" required>
          <Select
            v-model:value="formData.datasource"
            :options="dataSourceInstanceOptions"
            placeholder="请选择SSH数据源实例"
            :disabled="disabled"
            :loading="loading"
            @change="emitUpdate"
          />
        </FormItem>
      </Form>
    </Card>

    <Card title="脚本" :bordered="false" class="form-card">
      <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <FormItem label="脚本" required>
          <Input.TextArea
            v-model:value="formData.rawScript"
            placeholder="请输入要执行的脚本"
            :rows="10"
            :disabled="disabled"
            style="font-family: monospace"
            @change="emitUpdate"
          />
        </FormItem>
      </Form>
    </Card>

    <Card title="自定义参数" :bordered="false" class="form-card">
      <div class="param-section">
        <Button
          type="dashed"
          :disabled="disabled"
          @click="addCustomParam"
        >
          <Plus class="mr-1 size-4" />
          添加参数
        </Button>

        <div v-if="formData.localParams.length > 0" class="param-list">
          <div
            v-for="(param, index) in formData.localParams"
            :key="index"
            class="param-item"
          >
            <Input
              v-model:value="param.prop"
              placeholder="参数名"
              :disabled="disabled"
              style="width: 150px"
              @change="emitUpdate"
            />
            <Select
              v-model:value="param.direct"
              :options="directOptions"
              :disabled="disabled"
              style="width: 100px"
              @change="emitUpdate"
            />
            <Select
              v-model:value="param.type"
              :options="typeOptions"
              :disabled="disabled"
              style="width: 120px"
              @change="emitUpdate"
            />
            <Input
              v-model:value="param.value"
              placeholder="参数值"
              :disabled="disabled"
              style="flex: 1"
              @change="emitUpdate"
            />
            <Button
              type="text"
              danger
              :disabled="disabled"
              @click="removeCustomParam(index)"
            >
              <Trash class="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <Card title="前置任务" :bordered="false" class="form-card">
      <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <FormItem label="选择前置任务">
          <Select
            v-model:value="selectedPreTasks"
            mode="multiple"
            :options="preTaskOptions"
            placeholder="请选择前置任务节点"
            :disabled="disabled"
            style="width: 100%"
            @change="handlePreTasksChange"
          />
        </FormItem>
      </Form>
    </Card>
  </div>
</template>

<style scoped>
.remoteshell-task-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-card {
  margin-bottom: 0;
}

.form-card :deep(.ant-card-head) {
  min-height: 40px;
  padding: 0 16px;
  background: #fafafa;
}

.form-card :deep(.ant-card-head-title) {
  padding: 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.form-card :deep(.ant-card-body) {
  padding: 16px;
}

.param-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}
</style>
