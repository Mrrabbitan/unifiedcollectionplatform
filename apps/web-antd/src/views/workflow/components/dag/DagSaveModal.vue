<script lang="ts" setup>
import { ref, watch } from 'vue';

import { Modal, Form, FormItem, Input, InputNumber, Switch, Button, Space } from 'ant-design-vue';

import type { SaveForm, GlobalParam } from './types';

const props = defineProps<{
  visible: boolean;
  workflowName?: string;
  description?: string;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  save: [form: SaveForm];
}>();

const formState = ref<SaveForm>({
  name: '',
  description: '',
  executionType: 'PARALLEL',
  timeoutFlag: false,
  timeout: 0,
  globalParams: [],
  release: false,
});

watch(
  () => props.visible,
  (val) => {
    if (val) {
      formState.value.name = props.workflowName || '';
      formState.value.description = props.description || '';
    }
  }
);

function handleOk() {
  console.log('创建任务成功');
  emit('save', { ...formState.value });
  emit('update:visible', false);
}

function handleCancel() {
  emit('update:visible', false);
}

function addGlobalParam() {
  formState.value.globalParams.push({
    key: '',
    direct: 'IN',
    type: 'VARCHAR',
    value: '',
  });
}

function removeGlobalParam(index: number) {
  formState.value.globalParams.splice(index, 1);
}
</script>

<template>
  <Modal
    :open="props.visible"
    title="保存工作流"
    :width="600"
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <Form :label-col="{ span: 5 }" :wrapper-col="{ span: 18 }">
      <FormItem label="工作流名称" required>
        <Input v-model:value="formState.name" placeholder="请输入工作流名称" />
      </FormItem>
      <FormItem label="描述">
        <Input.TextArea
          v-model:value="formState.description"
          placeholder="请输入描述"
          :rows="3"
        />
      </FormItem>
      <FormItem label="执行方式">
        <Input v-model:value="formState.executionType" placeholder="执行方式" />
      </FormItem>
      <FormItem label="超时告警">
        <Switch v-model:checked="formState.timeoutFlag" />
      </FormItem>
      <FormItem v-if="formState.timeoutFlag" label="超时时间(分钟)">
        <InputNumber
          v-model:value="formState.timeout"
          :min="0"
          style="width: 100%"
        />
      </FormItem>
      <FormItem label="全局参数">
        <div class="global-params">
          <div
            v-for="(param, index) in formState.globalParams"
            :key="index"
            class="param-item"
          >
            <Input
              v-model:value="param.key"
              placeholder="参数名"
              style="width: 120px"
            />
            <Input
              v-model:value="param.value"
              placeholder="参数值"
              style="flex: 1"
            />
            <Button type="link" danger @click="removeGlobalParam(index)">
              删除
            </Button>
          </div>
          <Button type="dashed" block @click="addGlobalParam">
            + 添加参数
          </Button>
        </div>
      </FormItem>
      <FormItem label="是否上线">
        <Switch v-model:checked="formState.release" />
      </FormItem>
    </Form>
  </Modal>
</template>

<style scoped>
.global-params {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-item {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
