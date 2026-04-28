<script lang="ts" setup>
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Tag } from 'ant-design-vue';

import type { AiTaskPlan } from '../types';

defineOptions({ name: 'AiAssistantTaskPreviewCard' });

const props = defineProps<{
  plan: AiTaskPlan;
  pending?: boolean;
}>();

const emit = defineEmits<{
  (e: 'apply-form', plan: AiTaskPlan): void;
  (e: 'apply-direct', plan: AiTaskPlan): void;
}>();

const taskTypeLabel = computed(() => {
  switch (props.plan.taskType) {
    case 'streamCDC': {
      return 'CDC 实时采集';
    }
    case 'structuredBatch': {
      return '结构化批量采集';
    }
    default: {
      return '暂未支持';
    }
  }
});

const isUnsupported = computed(() => props.plan.taskType === 'unsupported');

const sourceLabel = computed(() => formatEndpoint(props.plan.source));
const targetLabel = computed(() => formatEndpoint(props.plan.target));

function formatEndpoint(endpoint: AiTaskPlan['source']) {
  const parts = [endpoint.type || '未识别'];
  if (endpoint.datasourceName) parts.push(endpoint.datasourceName);
  if (endpoint.database) parts.push(endpoint.database);
  if (endpoint.table) parts.push(endpoint.table);
  return parts.join(' / ');
}

const confidencePercent = computed(() =>
  Math.round((props.plan.confidence || 0) * 100),
);

const confidenceTone = computed(() => {
  const v = confidencePercent.value;
  if (v >= 75) return 'success';
  if (v >= 45) return 'processing';
  return 'warning';
});
</script>

<template>
  <div class="ai-plan-card" :class="{ 'ai-plan-card--unsupported': isUnsupported }">
    <div class="ai-plan-card__header">
      <div class="ai-plan-card__title">
        <IconifyIcon icon="lucide:wand-2" :style="{ fontSize: '16px' }" />
        <span>{{ plan.name || 'AI 推荐任务' }}</span>
      </div>
      <div class="ai-plan-card__tags">
        <Tag :color="isUnsupported ? 'default' : 'purple'" class="!m-0">
          {{ taskTypeLabel }}
        </Tag>
        <Tag :color="confidenceTone" class="!m-0">
          置信度 {{ confidencePercent }}%
        </Tag>
      </div>
    </div>

    <div class="ai-plan-card__body">
      <div class="ai-plan-card__row">
        <span class="ai-plan-card__label">源端</span>
        <span class="ai-plan-card__value">{{ sourceLabel }}</span>
      </div>
      <div class="ai-plan-card__row">
        <span class="ai-plan-card__label">目标端</span>
        <span class="ai-plan-card__value">{{ targetLabel }}</span>
      </div>
      <div v-if="plan.schedule" class="ai-plan-card__row">
        <span class="ai-plan-card__label">调度</span>
        <span class="ai-plan-card__value">
          {{ plan.schedule.mode || '自定义' }}
          <Tag v-if="plan.schedule.cron" color="default" class="!ml-2 !m-0">
            {{ plan.schedule.cron }}
          </Tag>
        </span>
      </div>
      <div v-if="plan.description" class="ai-plan-card__row">
        <span class="ai-plan-card__label">说明</span>
        <span class="ai-plan-card__value ai-plan-card__value--muted">
          {{ plan.description }}
        </span>
      </div>
    </div>

    <div v-if="plan.missing && plan.missing.length > 0" class="ai-plan-card__missing">
      <IconifyIcon icon="lucide:circle-alert" :style="{ fontSize: '14px' }" />
      <span>
        以下信息建议在表单页确认：
        <Tag
          v-for="field in plan.missing"
          :key="field"
          color="orange"
          class="!m-0 !ml-1"
        >
          {{ field }}
        </Tag>
      </span>
    </div>

    <div class="ai-plan-card__actions">
      <Button
        size="small"
        :disabled="isUnsupported || pending"
        @click="emit('apply-form', plan)"
      >
        <template #icon>
          <IconifyIcon icon="lucide:edit-3" />
        </template>
        跳到表单确认
      </Button>
      <Button
        type="primary"
        size="small"
        :disabled="isUnsupported"
        :loading="pending"
        @click="emit('apply-direct', plan)"
      >
        <template #icon>
          <IconifyIcon icon="lucide:zap" />
        </template>
        直接创建
      </Button>
    </div>
  </div>
</template>

<style scoped>
.ai-plan-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  margin-top: 8px;
  background: #fff;
  border: 1px solid #ede9fe;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgb(124 58 237 / 8%);
}

.ai-plan-card--unsupported {
  background: #fafafa;
  border-color: #e5e7eb;
  box-shadow: none;
}

.ai-plan-card__header {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.ai-plan-card__title {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.ai-plan-card__tags {
  display: flex;
  gap: 6px;
  align-items: center;
}

.ai-plan-card__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  font-size: 12px;
  color: #374151;
  background: #f9fafb;
  border-radius: 8px;
}

.ai-plan-card__row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.ai-plan-card__label {
  flex-shrink: 0;
  width: 48px;
  color: #6b7280;
}

.ai-plan-card__value {
  flex: 1;
  word-break: break-word;
}

.ai-plan-card__value--muted {
  color: #6b7280;
}

.ai-plan-card__missing {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  padding: 8px 10px;
  font-size: 12px;
  color: #92400e;
  background: #fffbeb;
  border-radius: 8px;
}

.ai-plan-card__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
