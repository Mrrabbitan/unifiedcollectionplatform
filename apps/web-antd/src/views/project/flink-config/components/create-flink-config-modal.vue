<script lang="ts" setup>
import type { FlinkJobConfigItem } from '#/api/flink-job-config';

import { onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Form, Input, InputNumber, message, Select } from 'ant-design-vue';

import { createFlinkJobConfig, updateFlinkJobConfig } from '#/api/flink-job-config';
import { getQueueAllList } from '#/api/queue';

defineOptions({ name: 'CreateFlinkConfigModal' });

const emit = defineEmits<{
  success: [];
}>();

const [Modal, modalApi] = useVbenModal({
  onConfirm: handleSubmit,
  onOpenChange: handleOpenChange,
});

const formState = ref({
  resourceName: '',
  flinkVersion: '1.15',
  jmMemory: 4096,
  tmMemory: 8192,
  submitMode: 'yarn-per-job',
  parallelism: 8,
  slots: 4,
  checkpointIntervalMs: 60000,
  checkpointTimeoutMs: 600000,
  queueName: '',
  checkpointDir: '',
});

const editMode = ref(false);
const currentConfig = ref<FlinkJobConfigItem | null>(null);
const loading = ref(false);
const queueOptions = ref<{ label: string; value: string }[]>([]);

const title = ref('新建资源配置');

const flinkVersionOptions = [
  { label: '1.13', value: '1.13' },
  { label: '1.15', value: '1.15' }
];

const submitModeOptions = [
  { label: 'yarn-per-job', value: 'yarn-per-job' },
  // { label: 'yarn-session', value: 'yarn-session' },
];

async function fetchQueueOptions() {
  try {
    const res = await getQueueAllList();
    queueOptions.value = (res || []).map((item: any) => ({
      label: item.queueName || item.queue,
      value: item.queueName || item.queue,
    }));
  } catch {
    queueOptions.value = [];
  }
}

function handleOpenChange(isOpen: boolean) {
  if (isOpen) {
    fetchQueueOptions();
    const data = modalApi.getData<{
      editMode: boolean;
      config?: FlinkJobConfigItem;
    }>();
    editMode.value = data?.editMode || false;
    currentConfig.value = data?.config || null;
    
    if (editMode.value && data?.config) {
      title.value = '编辑资源配置';
      formState.value = {
        resourceName: data.config.resourceName,
        flinkVersion: data.config.flinkVersion,
        jmMemory: data.config.jmMemory,
        tmMemory: data.config.tmMemory,
        submitMode: data.config.submitMode,
        parallelism: data.config.parallelism,
        slots: data.config.slots,
        checkpointIntervalMs: data.config.checkpointIntervalMs,
        checkpointTimeoutMs: data.config.checkpointTimeoutMs,
        queueName: data.config.queueName || '',
        checkpointDir: data.config.checkpointDir || '',
      };
    } else {
      title.value = '新建资源配置';
      formState.value = {
        resourceName: '',
        flinkVersion: '1.15',
        jmMemory: 1024,
        tmMemory: 2048,
        submitMode: 'yarn-per-job',
        parallelism: 4,
        slots: 2,
        checkpointIntervalMs: 60000,
        checkpointTimeoutMs: 600000,
        queueName: '',
        checkpointDir: '',
      };
    }
  }
}

async function handleSubmit() {
  if (!formState.value.resourceName) {
    message.error('请输入资源名称');
    return;
  }
  if (!formState.value.flinkVersion) {
    message.error('请选择Flink版本');
    return;
  }
  if (!formState.value.submitMode) {
    message.error('请选择提交模式');
    return;
  }

  loading.value = true;
  try {
    const submitData = {
      resourceName: formState.value.resourceName,
      flinkVersion: formState.value.flinkVersion,
      jmMemory: formState.value.jmMemory,
      tmMemory: formState.value.tmMemory,
      submitMode: formState.value.submitMode,
      parallelism: formState.value.parallelism,
      slots: formState.value.slots,
      checkpointIntervalMs: formState.value.checkpointIntervalMs,
      checkpointTimeoutMs: formState.value.checkpointTimeoutMs,
      queueName: formState.value.queueName,
      checkpointDir: formState.value.checkpointDir,
    };
    
    if (editMode.value && currentConfig.value) {
      await updateFlinkJobConfig({
        id: currentConfig.value.id,
        ...submitData,
      });
      message.success('编辑成功');
    } else {
      await createFlinkJobConfig(submitData);
      message.success('创建成功');
    }
    modalApi.close();
    emit('success');
  } catch {
    message.error(editMode.value ? '编辑失败' : '创建失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchQueueOptions();
});
</script>

<template>
  <Modal :title="title" class="w-[600px]">
    <Form layout="vertical">
      <Form.Item label="资源名称" required>
        <Input
          v-model:value="formState.resourceName"
          placeholder="请输入资源名称"
          allow-clear
        />
      </Form.Item>
      <Form.Item label="Flink版本" required>
        <Select
          v-model:value="formState.flinkVersion"
          placeholder="请选择Flink版本"
          :options="flinkVersionOptions"
        />
      </Form.Item>
      <Form.Item label="JobManager内存(MB)" required>
        <InputNumber
          v-model:value="formState.jmMemory"
          :min="256"
          :max="65536"
          style="width: 100%"
          placeholder="请输入JobManager内存"
        />
      </Form.Item>
      <Form.Item label="TaskManager内存(MB)" required>
        <InputNumber
          v-model:value="formState.tmMemory"
          :min="256"
          :max="65536"
          style="width: 100%"
          placeholder="请输入TaskManager内存"
        />
      </Form.Item>
      <Form.Item label="提交模式" required>
        <Select
          v-model:value="formState.submitMode"
          placeholder="请选择提交模式"
          :options="submitModeOptions"
        />
      </Form.Item>
      <Form.Item label="并行度" required>
        <InputNumber
          v-model:value="formState.parallelism"
          :min="1"
          :max="1024"
          style="width: 100%"
          placeholder="请输入并行度"
        />
      </Form.Item>
      <Form.Item label="Slots数量" required>
        <InputNumber
          v-model:value="formState.slots"
          :min="1"
          :max="256"
          style="width: 100%"
          placeholder="请输入每个TaskManager的Slot数量"
        />
      </Form.Item>
      <Form.Item label="Checkpoint间隔(ms)" required>
        <InputNumber
          v-model:value="formState.checkpointIntervalMs"
          :min="1000"
          :max="3600000"
          style="width: 100%"
          placeholder="请输入Checkpoint触发间隔"
        />
      </Form.Item>
      <Form.Item label="Checkpoint超时(ms)" required>
        <InputNumber
          v-model:value="formState.checkpointTimeoutMs"
          :min="10000"
          :max="3600000"
          style="width: 100%"
          placeholder="请输入Checkpoint超时时间"
        />
      </Form.Item>
      <Form.Item label="YARN队列">
        <Select
          v-model:value="formState.queueName"
          placeholder="请选择YARN队列"
          :options="queueOptions"
          allow-clear
        />
      </Form.Item>
      <Form.Item label="Checkpoint目录">
        <Input
          v-model:value="formState.checkpointDir"
          placeholder="请输入Checkpoint存储目录（HDFS/S3路径）"
          allow-clear
        />
      </Form.Item>
    </Form>
  </Modal>
</template>
