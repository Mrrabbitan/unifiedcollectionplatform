<script lang="ts" setup>
import type { QueueItem } from '#/api/queue';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Form, Input, message } from 'ant-design-vue';

import { createQueue, updateQueue } from '#/api/queue';

defineOptions({ name: 'CreateQueueModal' });

const emit = defineEmits<{
  success: [];
}>();

const [Modal, modalApi] = useVbenModal({
  onConfirm: handleSubmit,
  onOpenChange: handleOpenChange,
});

const formState = ref({
  queue: '',
  queueName: '',
});

const editMode = ref(false);
const currentQueue = ref<QueueItem | null>(null);
const loading = ref(false);

const title = ref('新建队列');

function handleOpenChange(isOpen: boolean) {
  if (isOpen) {
    const data = modalApi.getData<{
      editMode: boolean;
      queue?: QueueItem;
    }>();
    editMode.value = data?.editMode || false;
    currentQueue.value = data?.queue || null;
    
    if (editMode.value && data?.queue) {
      title.value = '编辑队列';
      formState.value = {
        queue: data.queue.queue,
        queueName: data.queue.queueName,
      };
    } else {
      title.value = '新建队列';
      formState.value = {
        queue: '',
        queueName: '',
      };
    }
  }
}

async function handleSubmit() {
  if (!formState.value.queue) {
    message.error('请输入YARN队列名称');
    return;
  }
  if (!formState.value.queueName) {
    message.error('请输入队列显示名称');
    return;
  }

  loading.value = true;
  try {
    if (editMode.value && currentQueue.value) {
      await updateQueue({
        id: currentQueue.value.id,
        queue: formState.value.queue,
        queueName: formState.value.queueName,
      });
      message.success('编辑成功');
    } else {
      await createQueue({
        queue: formState.value.queue,
        queueName: formState.value.queueName,
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
</script>

<template>
  <Modal :title="title">
    <Form layout="vertical">
      <Form.Item label="队列显示名称" required>
        <Input
          v-model:value="formState.queueName"
          placeholder="请输入队列显示名称"
          allow-clear
        />
      </Form.Item>
      <Form.Item label="YARN队列名称" required>
        <Input
          v-model:value="formState.queue"
          placeholder="请输入YARN队列名称"
          allow-clear
        />
      </Form.Item>
    </Form>
  </Modal>
</template>
