<script lang="ts" setup>
import type { EnvironmentItem } from '#/api/environment-manage';

import { onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Form, Input, message, Select } from 'ant-design-vue';

import { createEnvironment, updateEnvironment } from '#/api/environment-manage';
import { getWorkerGroupAllList } from '#/api/worker-group';

defineOptions({ name: 'CreateEnvironmentModal' });

const emit = defineEmits<{
  success: [];
}>();

const [Modal, modalApi] = useVbenModal({
  onConfirm: handleSubmit,
  onOpenChange: handleOpenChange,
});

const formState = ref({
  name: '',
  config: '',
  description: '',
  workerGroups: [] as string[],
});

const editMode = ref(false);
const currentEnvironment = ref<EnvironmentItem | null>(null);
const loading = ref(false);
const workerGroupOptions = ref<{ label: string; value: string }[]>([]);

const title = ref('新建环境');

async function fetchWorkerGroupOptions() {
  try {
    const res = await getWorkerGroupAllList();
    workerGroupOptions.value = (res || []).map((item: any) => ({
      label: item.name || item,
      value: item.name || item,
    }));
  } catch {
    workerGroupOptions.value = [];
  }
}

function handleOpenChange(isOpen: boolean) {
  if (isOpen) {
    fetchWorkerGroupOptions();
    const data = modalApi.getData<{
      editMode: boolean;
      environment?: EnvironmentItem;
    }>();
    editMode.value = data?.editMode || false;
    currentEnvironment.value = data?.environment || null;
    
    if (editMode.value && data?.environment) {
      title.value = '编辑环境';
      formState.value = {
        name: data.environment.name,
        config: data.environment.config,
        description: data.environment.description || '',
        workerGroups: data.environment.workerGroups ? data.environment.workerGroups.split(',') : [],
      };
    } else {
      title.value = '新建环境';
      formState.value = {
        name: '',
        config: '',
        description: '',
        workerGroups: [],
      };
    }
  }
}

async function handleSubmit() {
  if (!formState.value.name) {
    message.error('请输入环境名称');
    return;
  }
  if (!formState.value.config) {
    message.error('请输入环境配置');
    return;
  }

  loading.value = true;
  try {
    const workerGroupsStr = formState.value.workerGroups.join(',');
    if (editMode.value && currentEnvironment.value) {
      await updateEnvironment({
        code: currentEnvironment.value.code,
        name: formState.value.name,
        config: formState.value.config,
        description: formState.value.description,
        workerGroups: workerGroupsStr,
      });
      message.success('编辑成功');
    } else {
      await createEnvironment({
        name: formState.value.name,
        config: formState.value.config,
        description: formState.value.description,
        workerGroups: workerGroupsStr,
      });
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
  fetchWorkerGroupOptions();
});
</script>

<template>
  <Modal :title="title">
    <Form layout="vertical">
      <Form.Item label="环境名称" required>
        <Input
          v-model:value="formState.name"
          placeholder="请输入环境名称"
          allow-clear
        />
      </Form.Item>
      <Form.Item label="环境配置" required>
        <Input.TextArea
          v-model:value="formState.config"
          placeholder="请输入环境配置内容，如：export JAVA_HOME=/usr/lib/jvm/java-8"
          :rows="4"
          allow-clear
        />
      </Form.Item>
      <Form.Item label="关联Worker分组">
        <Select
          v-model:value="formState.workerGroups"
          mode="multiple"
          placeholder="请选择关联的Worker分组"
          :options="workerGroupOptions"
          allow-clear
        />
      </Form.Item>
      <Form.Item label="描述">
        <Input.TextArea
          v-model:value="formState.description"
          placeholder="请输入描述"
          :rows="4"
          allow-clear
        />
      </Form.Item>
    </Form>
  </Modal>
</template>
