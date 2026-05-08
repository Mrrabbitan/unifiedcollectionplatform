<script lang="ts" setup>
import type { ChatMessage } from '../types';

import { computed } from 'vue';

import ActionTrace from './action-trace.vue';
import MissingParamsCard from './missing-params-card.vue';
import ThinkingPanel from './thinking-panel.vue';

defineOptions({ name: 'AiqaChatBubble' });

const props = defineProps<{
  msg: ChatMessage;
}>();

const emit = defineEmits<{
  (e: 'submit-question', payload: { msgId: string; answers: Record<string, string> }): void;
}>();

const isUser = computed(() => props.msg.role === 'user');

function onSubmit(answers: Record<string, string>) {
  emit('submit-question', { msgId: props.msg.id, answers });
}
</script>

<template>
  <div class="bubble" :class="{ 'bubble--user': isUser }">
    <div class="bubble__avatar">
      <span v-if="isUser" class="bubble__avatar-text">U</span>
      <span v-else class="bubble__avatar-text bubble__avatar-text--ai">AI</span>
    </div>
    <div class="bubble__body">
      <div v-if="msg.attachment" class="bubble__attachment">
        📎 {{ msg.attachment.fileName }}
      </div>

      <div v-if="msg.content" class="bubble__content">{{ msg.content }}</div>

      <ThinkingPanel
        v-if="!isUser && msg.thinking"
        :text="msg.thinking"
        :done="msg.thinkingDone"
      />

      <ActionTrace v-if="!isUser && msg.actions?.length" :actions="msg.actions" />

      <MissingParamsCard
        v-if="!isUser && msg.question"
        :question="msg.question"
        :resolved="msg.questionResolved"
        @submit="onSubmit"
      />

      <div v-if="!isUser && msg.loading && !msg.content" class="bubble__typing">
        <span /> <span /> <span />
      </div>
    </div>
  </div>
</template>

<style scoped>
.bubble {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.bubble--user {
  flex-direction: row-reverse;
}

.bubble__avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f1f5f9;
  border-radius: 50%;
}

.bubble--user .bubble__avatar {
  background: #e0e7ff;
}

.bubble__avatar-text {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.bubble__avatar-text--ai {
  font-size: 11px;
  color: #1677ff;
}

.bubble__body {
  flex: 1;
  max-width: calc(100% - 64px);
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.65;
  color: rgba(0, 0, 0, 0.85);
  background: #f6f8fb;
  border-radius: 10px;
}

.bubble--user .bubble__body {
  color: #fff;
  background: #1677ff;
}

.bubble--user .bubble__body :deep(*) {
  color: #fff;
}

.bubble__attachment {
  display: inline-block;
  padding: 4px 10px;
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
}

.bubble--user .bubble__attachment {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.18);
}

.bubble__content {
  white-space: pre-wrap;
  word-break: break-word;
}

.bubble__typing {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 6px 0;
}

.bubble__typing span {
  width: 6px;
  height: 6px;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.bubble__typing span:nth-child(2) {
  animation-delay: 0.2s;
}

.bubble__typing span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: scale(0.7);
  }

  40% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
