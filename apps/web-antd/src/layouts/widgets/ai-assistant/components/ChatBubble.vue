<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Badge } from 'ant-design-vue';

defineOptions({ name: 'AiAssistantChatBubble' });

const props = defineProps<{
  unread?: number;
  active?: boolean;
}>();

const emit = defineEmits<{
  (e: 'click'): void;
}>();

/**
 * 浮球支持纵向拖拽（防止挡到底部按钮）。
 * 拖动幅度过小时仍按点击处理，体验更接近原生悬浮按钮。
 */
const bubbleRef = ref<HTMLElement | null>(null);
const offsetY = ref(0);
const isDragging = ref(false);
const dragMoved = ref(false);

let startY = 0;
let startOffset = 0;

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  isDragging.value = true;
  dragMoved.value = false;
  startY = event.clientY;
  startOffset = offsetY.value;
  bubbleRef.value?.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (!isDragging.value) return;
  const dy = event.clientY - startY;
  if (Math.abs(dy) > 4) dragMoved.value = true;
  const next = startOffset - dy;
  const max = window.innerHeight - 220;
  offsetY.value = Math.min(Math.max(next, 0), max);
}

function onPointerUp(event: PointerEvent) {
  if (!isDragging.value) return;
  isDragging.value = false;
  bubbleRef.value?.releasePointerCapture?.(event.pointerId);
  if (!dragMoved.value) emit('click');
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    emit('click');
  }
}

onMounted(() => {
  offsetY.value = 24;
});

onUnmounted(() => {
  isDragging.value = false;
});
</script>

<template>
  <div
    ref="bubbleRef"
    class="ai-bubble"
    role="button"
    tabindex="0"
    :aria-pressed="props.active ? 'true' : 'false'"
    :class="{ 'ai-bubble--active': props.active }"
    :style="{ bottom: `${offsetY}px` }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
    @keydown="onKeyDown"
  >
    <Badge :count="props.unread || 0" :overflow-count="9" :offset="[-4, 4]">
      <div class="ai-bubble__inner">
        <IconifyIcon
          icon="lucide:sparkles"
          class="ai-bubble__icon"
          :style="{ fontSize: '24px', color: '#fff' }"
        />
        <span class="ai-bubble__pulse" />
      </div>
    </Badge>
    <span class="ai-bubble__label">AI 助手</span>
  </div>
</template>

<style scoped>
.ai-bubble {
  position: fixed;
  right: 24px;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  outline: none;
  transition: transform 0.2s ease;
}

.ai-bubble:hover {
  transform: translateY(-2px);
}

.ai-bubble--active .ai-bubble__inner {
  box-shadow: 0 12px 24px rgb(124 58 237 / 35%);
}

.ai-bubble__inner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  border-radius: 50%;
  box-shadow: 0 8px 18px rgb(76 29 149 / 35%);
}

.ai-bubble__icon {
  filter: drop-shadow(0 0 6px rgb(255 255 255 / 30%));
}

.ai-bubble__pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgb(124 58 237 / 50%);
  animation: ai-bubble-pulse 2.4s ease-out infinite;
}

.ai-bubble__label {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
  background: rgb(76 29 149 / 70%);
  border-radius: 999px;
  backdrop-filter: blur(4px);
}

@keyframes ai-bubble-pulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  70% {
    transform: scale(1.6);
    opacity: 0;
  }
  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}
</style>
