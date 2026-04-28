<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Input, Tooltip } from 'ant-design-vue';

import { useAiAssistant } from '../composables/useAiAssistant';

import MessageItem from './MessageItem.vue';
import QuickPrompts from './QuickPrompts.vue';

defineOptions({ name: 'AiAssistantChatPanel' });

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const {
  messages,
  isPending,
  sendMessage,
  applyPlanToForm,
  applyPlanDirect,
  reset,
} = useAiAssistant();

const inputValue = ref('');
const listRef = ref<HTMLDivElement | null>(null);

const placeholder = computed(() =>
  isPending.value ? '助手正在思考，请稍候...' : '描述你的采集需求...',
);

async function scrollToBottom() {
  await nextTick();
  if (!listRef.value) return;
  listRef.value.scrollTop = listRef.value.scrollHeight;
}

watch(
  () => messages.value.length,
  () => {
    scrollToBottom();
  },
);

watch(
  () => isPending.value,
  () => scrollToBottom(),
);

onMounted(() => {
  scrollToBottom();
});

async function handleSubmit() {
  const text = inputValue.value.trim();
  if (!text || isPending.value) return;
  inputValue.value = '';
  try {
    await sendMessage(text);
  } catch {
    // 错误信息已经写进消息流里
  }
}

function handlePromptSelect(text: string) {
  inputValue.value = text;
}
</script>

<template>
  <Transition name="ai-panel">
    <div v-if="visible" class="ai-panel" role="dialog" aria-label="AI 采集助手">
      <header class="ai-panel__header">
        <div class="ai-panel__title">
          <span class="ai-panel__avatar">
            <IconifyIcon icon="lucide:sparkles" :style="{ fontSize: '16px', color: '#fff' }" />
          </span>
          <div>
            <h3>AI 采集助手</h3>
            <p>用一句话描述需求，自动生成采集任务</p>
          </div>
        </div>
        <div class="ai-panel__actions">
          <Tooltip title="清空对话">
            <Button
              type="text"
              size="small"
              :disabled="isPending || messages.length <= 1"
              @click="reset"
            >
              <template #icon>
                <IconifyIcon icon="lucide:rotate-ccw" :style="{ color: '#fff' }" />
              </template>
            </Button>
          </Tooltip>
          <Tooltip title="收起">
            <Button type="text" size="small" @click="emit('close')">
              <template #icon>
                <IconifyIcon icon="lucide:x" :style="{ color: '#fff' }" />
              </template>
            </Button>
          </Tooltip>
        </div>
      </header>

      <QuickPrompts @select="handlePromptSelect" />

      <main ref="listRef" class="ai-panel__list">
        <MessageItem
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
          :pending="isPending"
          @apply-form="(plan) => applyPlanToForm(plan)"
          @apply-direct="(plan) => applyPlanDirect(plan)"
        />
      </main>

      <footer class="ai-panel__footer">
        <Input.TextArea
          v-model:value="inputValue"
          :placeholder="placeholder"
          :auto-size="{ minRows: 1, maxRows: 3 }"
          :disabled="isPending"
          class="ai-panel__input"
          @press-enter="
            (event: KeyboardEvent) => {
              if (event.shiftKey) return;
              event.preventDefault();
              handleSubmit();
            }
          "
        />
        <Button
          type="primary"
          shape="circle"
          :loading="isPending"
          :disabled="!inputValue.trim() && !isPending"
          @click="handleSubmit"
        >
          <template #icon>
            <IconifyIcon icon="lucide:send" />
          </template>
        </Button>
      </footer>
    </div>
  </Transition>
</template>

<style scoped>
.ai-panel {
  position: fixed;
  right: 24px;
  bottom: 100px;
  z-index: 1099;
  display: flex;
  flex-direction: column;
  width: 380px;
  max-height: calc(100vh - 140px);
  overflow: hidden;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgb(15 23 42 / 18%);
}

.ai-panel__header {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  color: #fff;
}

.ai-panel__title {
  display: flex;
  gap: 12px;
  align-items: center;
}

.ai-panel__title h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.ai-panel__title p {
  margin: 2px 0 0;
  font-size: 11px;
  color: rgb(255 255 255 / 80%);
}

.ai-panel__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgb(255 255 255 / 20%);
  border-radius: 50%;
}

.ai-panel__actions {
  display: flex;
  gap: 4px;
}

.ai-panel__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  padding: 14px;
  overflow-y: auto;
  background: #fafaff;
}

.ai-panel__footer {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 10px 12px;
  border-top: 1px solid #f1f5f9;
  background: #fff;
}

.ai-panel__input {
  flex: 1;
  resize: none;
  border-radius: 10px !important;
}

.ai-panel-enter-active,
.ai-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.ai-panel-enter-from,
.ai-panel-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (max-width: 480px) {
  .ai-panel {
    right: 8px;
    bottom: 90px;
    width: calc(100vw - 16px);
  }
}
</style>
