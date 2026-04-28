<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useAccessStore, useUserStore } from '@vben/stores';

import ChatBubble from './components/ChatBubble.vue';
import ChatPanel from './components/ChatPanel.vue';
import { useAiAssistant } from './composables/useAiAssistant';

defineOptions({ name: 'AiAssistant' });

const accessStore = useAccessStore();
const userStore = useUserStore();
const route = useRoute();

const { isOpen, unread, togglePanel, closePanel } = useAiAssistant();

/**
 * 在以下场景隐藏浮球：
 * 1. 用户未登录（认证页 / 登录过期）
 * 2. 锁屏激活时
 * 3. 路由 meta 显式声明 hideAiAssistant
 * 4. 进入认证类页面（路径以 /auth 开头）
 */
const visible = computed(() => {
  if (!userStore.userInfo) return false;
  if (accessStore.isLockScreen) return false;
  if (route.path.startsWith('/auth')) return false;
  if (route.meta?.hideAiAssistant) return false;
  return true;
});
</script>

<template>
  <Teleport to="body">
    <template v-if="visible">
      <ChatBubble :unread="unread" :active="isOpen" @click="togglePanel" />
      <ChatPanel :visible="isOpen" @close="closePanel" />
    </template>
  </Teleport>
</template>
