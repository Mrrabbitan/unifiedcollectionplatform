<script lang="ts" setup>
import type { PickedSourceTarget } from './types';

import { computed, nextTick, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { storeToRefs } from 'pinia';

import { useAiqaChatStore } from '#/store/aiqa-chat';

import ChatPage from './components/chat-page.vue';
import ConversationList from './components/conversation-list.vue';
import SourceTargetPickerModal from './components/source-target-picker-modal.vue';

defineOptions({ name: 'AiqaIndex' });

const store = useAiqaChatStore();
const { activeConversation } = storeToRefs(store);

const pickerRef = ref<InstanceType<typeof SourceTargetPickerModal> | null>(
  null,
);
const chatRef = ref<InstanceType<typeof ChatPage> | null>(null);

/**
 * 进入页面策略（新版）：
 *  - 始终保证存在一条 active 对话；
 *  - 但不再强制立即选源/目标 —— 用户先打字、点击发送时再弹选择框，
 *    交互逻辑由 ChatPage 通过 `request-pick` 事件驱动。
 */
onMounted(async () => {
  await nextTick();
  if (!activeConversation.value) {
    store.createConversation(null);
  }
});

const picked = computed<PickedSourceTarget | null>(
  () => activeConversation.value?.picked ?? null,
);

const initialPick = computed<PickedSourceTarget | null>(
  () => activeConversation.value?.picked ?? null,
);

function onConfirm(value: PickedSourceTarget) {
  const conv = store.activeConversation;
  if (!conv) {
    const newConv = store.createConversation(value);
    store.setActive(newConv.id);
    return;
  }
  store.setPicked(conv.id, value);
  // ChatPage 内部 watch(props.picked) 会感知到变化，
  // 自动续发用户在弹框前已经准备好的内容。
}

function onCancel() {
  // 用户取消选择 → 保留当前输入，仅取消"待发"标记
  chatRef.value?.cancelPendingSend();
}

function onRequestPick() {
  pickerRef.value?.open();
}

function onSwitch() {
  pickerRef.value?.open();
}

function onNewChat() {
  store.createConversation(null);
}

function onSelectConversation(id: string) {
  store.setActive(id);
}
</script>

<template>
  <Page :auto-content-height="true" content-class="aiqa-page-content">
    <SourceTargetPickerModal
      ref="pickerRef"
      :initial="initialPick"
      @confirm="onConfirm"
      @cancel="onCancel"
    />
    <div class="aiqa-shell">
      <ConversationList
        @new-chat="onNewChat"
        @select="onSelectConversation"
      />
      <div class="aiqa-shell__main">
        <ChatPage
          ref="chatRef"
          :picked="picked"
          @switch-source="onSwitch"
          @new-chat="onNewChat"
          @request-pick="onRequestPick"
        />
      </div>
    </div>
  </Page>
</template>

<style scoped>
.aiqa-shell {
  display: flex;
  height: calc(100vh - 96px);
  overflow: hidden;
  background: #fff;
  border-radius: 8px;
}

.aiqa-shell__main {
  flex: 1;
  min-width: 0;
}

:deep(.aiqa-page-content) {
  padding: 0;
}
</style>
