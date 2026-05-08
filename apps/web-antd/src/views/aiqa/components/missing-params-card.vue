<script lang="ts" setup>
import type { MissingParamsQuestion } from '../types';

import { reactive } from 'vue';

import { $t } from '@vben/locales';

import { Button, Form, FormItem, Input, InputNumber } from 'ant-design-vue';

defineOptions({ name: 'AiqaMissingParamsCard' });

const props = defineProps<{
  question: MissingParamsQuestion;
  resolved?: boolean;
}>();

const emit = defineEmits<{
  (e: 'submit', answers: Record<string, string>): void;
}>();

const formState = reactive<Record<string, number | string>>(
  Object.fromEntries(
    props.question.fields.map((f) => [f.key, f.defaultValue ?? '']),
  ),
);

function onSubmit() {
  for (const f of props.question.fields) {
    if (
      f.required &&
      (formState[f.key] === '' || formState[f.key] === undefined)
    ) {
      return;
    }
  }
  const answers: Record<string, string> = {};
  for (const f of props.question.fields) {
    answers[f.key] = String(formState[f.key] ?? '');
  }
  emit('submit', answers);
}
</script>

<template>
  <div class="mp-card" :class="{ 'mp-card--resolved': props.resolved }">
    <div class="mp-card__header">
      <span class="mp-card__icon">?</span>
      <div class="mp-card__title">
        <div class="mp-card__t">{{ props.question.title }}</div>
        <div v-if="props.question.description" class="mp-card__d">
          {{ props.question.description }}
        </div>
      </div>
    </div>
    <Form layout="vertical" class="mp-card__form" :disabled="props.resolved">
      <FormItem
        v-for="f in props.question.fields"
        :key="f.key"
        :label="f.label"
        :required="f.required"
      >
        <InputNumber
          v-if="f.type === 'number'"
          v-model:value="(formState[f.key] as number)"
          :placeholder="f.placeholder"
          style="width: 100%"
        />
        <Input.Password
          v-else-if="f.type === 'password'"
          v-model:value="(formState[f.key] as string)"
          :placeholder="f.placeholder"
        />
        <Input.TextArea
          v-else-if="f.type === 'textarea'"
          v-model:value="(formState[f.key] as string)"
          :placeholder="f.placeholder"
          :rows="3"
        />
        <Input
          v-else
          v-model:value="(formState[f.key] as string)"
          :placeholder="f.placeholder"
        />
      </FormItem>
      <div class="mp-card__actions">
        <Button
          v-if="!props.resolved"
          type="primary"
          @click="onSubmit"
          >{{ $t('aiqa.submitParams') }}</Button
        >
        <span v-else class="mp-card__done">已提交</span>
      </div>
    </Form>
  </div>
</template>

<style scoped>
.mp-card {
  padding: 14px 16px;
  margin: 12px 0;
  background: #fffaf0;
  border: 1px solid #fde6b3;
  border-radius: 10px;
}

.mp-card--resolved {
  background: #f0f9ff;
  border-color: #bfe4ff;
}

.mp-card__header {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 12px;
}

.mp-card__icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  font-weight: 700;
  color: #fff;
  background: #f59e0b;
  border-radius: 50%;
}

.mp-card--resolved .mp-card__icon {
  background: #1677ff;
}

.mp-card__title {
  flex: 1;
}

.mp-card__t {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.mp-card__d {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
}

.mp-card__form :deep(.ant-form-item) {
  margin-bottom: 10px;
}

.mp-card__actions {
  margin-top: 4px;
  text-align: right;
}

.mp-card__done {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.5);
}
</style>
