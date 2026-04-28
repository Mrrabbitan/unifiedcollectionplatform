<script lang="ts" setup>
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import TaskPreviewCard from './TaskPreviewCard.vue';

import type { AiAssistantMessage, AiTaskPlan } from '../types';

defineOptions({ name: 'AiAssistantMessageItem' });

const props = defineProps<{
  message: AiAssistantMessage;
  pending?: boolean;
}>();

const emit = defineEmits<{
  (e: 'apply-form', plan: AiTaskPlan): void;
  (e: 'apply-direct', plan: AiTaskPlan): void;
}>();

const isUser = computed(() => props.message.role === 'user');
const isPending = computed(() => props.message.status === 'pending');
const isError = computed(() => props.message.status === 'error');

const lines = computed(() => (props.message.content || '').split('\n'));
</script>

<template>
  <div class="ai-msg" :class="{ 'ai-msg--user': isUser }">
    <div class="ai-msg__avatar">
      <IconifyIcon
        :icon="isUser ? 'lucide:user' : 'lucide:sparkles'"
        :style="{ fontSize: '16px', color: isUser ? '#1677ff' : '#7c3aed' }"
      />
    </div>
    <div class="ai-msg__bubble" :class="{ 'ai-msg__bubble--error': isError }">
      <div v-if="isPending" class="ai-msg__pending">
        <span class="ai-msg__dot" />
        <span class="ai-msg__dot" />
        <span class="ai-msg__dot" />
        <span class="ai-msg__pending-text">正在思考...</span>
      </div>
      <template v-else>
        <p
          v-for="(line, idx) in lines"
          :key="idx"
          class="ai-msg__line"
          :class="{ 'ai-msg__line--empty': !line }"
        >
          {{ line }}
        </p>
      </template>

      <TaskPreviewCard
        v-if="message.plan && !isPending"
        :plan="message.plan"
        :pending="props.pending"
        @apply-form="(plan) => emit('apply-form', plan)"
        @apply-direct="(plan) => emit('apply-direct', plan)"
      />
    </div>
  </div>
</template>

<style scoped>
.ai-msg {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.ai-msg--user {
  flex-direction: row-reverse;
}

.ai-msg__avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: #f5f3ff;
  border-radius: 50%;
}

.ai-msg--user .ai-msg__avatar {
  background: #e6f4ff;
}

.ai-msg__bubble {
  display: flex;
  flex-direction: column;
  max-width: 85%;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.55;
  color: #1f2937;
  background: #f5f3ff;
  border-radius: 12px;
}

.ai-msg--user .ai-msg__bubble {
  color: #fff;
  background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
}

.ai-msg__bubble--error {
  color: #b91c1c;
  background: #fef2f2;
  border: 1px solid #fee2e2;
}

.ai-msg__line {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}

.ai-msg__line--empty {
  height: 6px;
}

.ai-msg__pending {
  display: flex;
  gap: 6px;
  align-items: center;
}

.ai-msg__pending-text {
  font-size: 12px;
  color: #6b7280;
}

.ai-msg__dot {
  width: 6px;
  height: 6px;
  background: #a78bfa;
  border-radius: 50%;
  animation: ai-dot-bounce 1.2s ease-in-out infinite;
}

.ai-msg__dot:nth-child(2) {
  animation-delay: 0.2s;
}

.ai-msg__dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes ai-dot-bounce {
  0%,
  80%,
  100% {
    transform: scale(0.6);
    opacity: 0.4;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
