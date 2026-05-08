<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { $t } from '@vben/locales';

defineOptions({ name: 'AiqaThinkingPanel' });

const props = defineProps<{
  text: string;
  done?: boolean;
}>();

const collapsed = ref(false);

watch(
  () => props.done,
  (isDone) => {
    if (isDone) collapsed.value = true;
  },
);

const headerText = computed(() =>
  props.done ? $t('aiqa.thinkingDone') : $t('aiqa.thinking'),
);
</script>

<template>
  <div class="thinking-panel" :class="{ 'thinking-panel--done': props.done }">
    <button
      type="button"
      class="thinking-panel__header"
      @click="collapsed = !collapsed"
    >
      <span class="thinking-panel__icon">{{ props.done ? '✓' : '✦' }}</span>
      <span class="thinking-panel__title">{{ headerText }}</span>
      <span
        class="thinking-panel__caret"
        :class="{ 'thinking-panel__caret--open': !collapsed }"
        >▾</span
      >
    </button>
    <div v-show="!collapsed" class="thinking-panel__body">
      <pre>{{ props.text }}</pre>
    </div>
  </div>
</template>

<style scoped>
.thinking-panel {
  margin: 6px 0 12px;
  overflow: hidden;
  background: #f6f8fb;
  border: 1px solid #e8edf5;
  border-radius: 8px;
}

.thinking-panel--done {
  background: #f8fbf6;
  border-color: #def0d4;
}

.thinking-panel__header {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  background: transparent;
  border: 0;
}

.thinking-panel__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 11px;
  color: #fff;
  background: #6b7280;
  border-radius: 50%;
}

.thinking-panel--done .thinking-panel__icon {
  background: #16a34a;
}

.thinking-panel__title {
  flex: 1;
  text-align: left;
}

.thinking-panel__caret {
  font-size: 10px;
  color: rgba(0, 0, 0, 0.45);
  transition: transform 0.2s ease;
}

.thinking-panel__caret--open {
  transform: rotate(180deg);
}

.thinking-panel__body {
  padding: 8px 12px 10px;
  border-top: 1px dashed rgba(0, 0, 0, 0.06);
}

.thinking-panel__body pre {
  padding: 0;
  margin: 0;
  overflow-x: auto;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.7);
  white-space: pre-wrap;
  word-break: break-word;
  background: transparent;
}
</style>
