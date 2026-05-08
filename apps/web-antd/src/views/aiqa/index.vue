<script lang="ts" setup>
import type { PickedSourceTarget } from './types';

import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Empty } from 'ant-design-vue';
import { storeToRefs } from 'pinia';

import { useAiqaChatStore } from '#/store/aiqa-chat';

import ChatPage from './components/chat-page.vue';
import ConversationList from './components/conversation-list.vue';
import SourceTargetPickerModal from './components/source-target-picker-modal.vue';

defineOptions({ name: 'AiqaIndex' });

const router = useRouter();
const store = useAiqaChatStore();
const { activeConversation } = storeToRefs(store);

const pickerRef = ref<InstanceType<typeof SourceTargetPickerModal> | null>(
  null,
);

/**
 * 进入页面时的策略：
 *  - 已有 active 对话且已选源/目标 → 直接展示，不打扰；
 *  - 没有 active 对话 → 创建一条新的并弹出选择框；
 *  - active 对话还没选源/目标 → 打开选择框补齐。
 *
 * 这里不强制路由跳转：取消选择只视作"关闭弹窗"，
 * 不再像旧版那样 router.back()，避免侧边栏切换体验被打断。
 */
onMounted(async () => {
  await nextTick();
  if (!activeConversation.value) {
    store.createConversation(null);
    pickerRef.value?.open();
  } else if (!activeConversation.value.picked) {
    pickerRef.value?.open();
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
}

function onCancel() {
  // 用户取消时：若当前对话仍然没有 picked，并且整个仓库只剩这一条空对话，
  // 就把它清掉，避免侧边栏出现"假对话"。
  const conv = store.activeConversation;
  if (conv && !conv.picked && conv.messages.length === 0) {
    store.deleteConversation(conv.id);
  }
  if (store.conversations.length === 0 && window.history.length > 1) {
    router.back();
  }
}

function onSwitch() {
  pickerRef.value?.open();
}

function onNewChat() {
  // 「新建对话」：再造一条空对话并弹出选择框
  store.createConversation(null);
  nextTick(() => pickerRef.value?.open());
}

function onSelectConversation(id: string) {
  store.setActive(id);
  // 若选中的历史对话此前没填过源/目标，仍然引导一下
  nextTick(() => {
    if (!store.activeConversation?.picked) pickerRef.value?.open();
  });
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
          v-if="picked"
          :picked="picked"
          @switch-source="onSwitch"
          @new-chat="onNewChat"
        />
        <div v-else class="aiqa-loading">
          <Empty
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            description="请先选择数据源以开始对话"
          />
        </div>
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

.aiqa-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

:deep(.aiqa-page-content) {
  padding: 0;
}
</style>
