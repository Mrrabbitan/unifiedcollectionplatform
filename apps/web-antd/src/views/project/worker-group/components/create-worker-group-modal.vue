<script lang="ts" setup>
import type { WorkerGroupItem } from '#/api/worker-group';

import { onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Form, Input, message, Select } from 'ant-design-vue';

import { createWorkerGroup, getWorkerAddressList } from '#/api/worker-group';

defineOptions({ name: 'CreateWorkerGroupModal' });

const emit = defineEmits<{
  success: [];
}>();

const [Modal, modalApi] = useVbenModal({
  onConfirm: handleSubmit,
  onOpenChange: handleOpenChange,
});

const formState = ref({
  name: '',
  addrList: [] as string[],
  description: '',
});

const editMode = ref(false);
const currentWorkerGroup = ref<WorkerGroupItem | null>(null);
const loading = ref(false);
const workerAddressOptions = ref<{ label: string; value: string }[]>([]);
const loadingAddresses = ref(false);

const title = ref('新建Worker分组');

async function fetchWorkerAddressList() {
  loadingAddresses.value = true;
  try {
    const res = await getWorkerAddressList();
    workerAddressOptions.value = (res || []).map((addr: string) => ({
      label: addr,
      value: addr,
    }));
  } catch {
    workerAddressOptions.value = [];
  } finally {
    loadingAddresses.value = false;
  }
}

function handleOpenChange(isOpen: boolean) {
  if (isOpen) {
    fetchWorkerAddressList();
    const data = modalApi.getData<{
      editMode: boolean;
      workerGroup?: WorkerGroupItem;
    }>();
    editMode.value = data?.editMode || false;
    currentWorkerGroup.value = data?.workerGroup || null;
    
    if (editMode.value && data?.workerGroup) {
      title.value = '编辑Worker分组';
      formState.value = {
        name: data.workerGroup.name,
        addrList: data.workerGroup.addrList ? data.workerGroup.addrList.split(',') : [],
        description: data.workerGroup.description || '',
      };
    } else {
      title.value = '新建Worker分组';
      formState.value = {
        name: '',
        addrList: [],
        description: '',
      };
    }
  }
}

async function handleSubmit() {
  if (!formState.value.name) {
    message.error('请输入分组名称');
    return;
  }
  if (formState.value.addrList.length === 0) {
    message.error('请选择Worker地址');
    return;
  }

  loading.value = true;
  try {
    await createWorkerGroup({
      id: editMode.value && currentWorkerGroup.value ? currentWorkerGroup.value.id : undefined,
      name: formState.value.name,
      addrList: formState.value.addrList.join(','),
      description: formState.value.description,
    });
    message.success(editMode.value ? '编辑成功' : '创建成功');
    modalApi.close();
    emit('success');
  } catch {
    message.error(editMode.value ? '编辑失败' : '创建失败');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchWorkerAddressList();
});
</script>

<template>
  <Modal :title="title">
    <Form layout="vertical">
      <Form.Item label="分组名称" required>
        <Input
          v-model:value="formState.name"
          placeholder="请输入分组名称"
          allow-clear
        />
      </Form.Item>
      <Form.Item label="Worker地址列表" required>
        <Select
          v-model:value="formState.addrList"
          mode="multiple"
          placeholder="请选择Worker地址"
          :options="workerAddressOptions"
          :loading="loadingAddresses"
          allow-clear
          :filter-option="(input: string, option: { label: string }) => option.label.toLowerCase().includes(input.toLowerCase())"
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
