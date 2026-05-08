import type { ChatMessage, PickedSourceTarget } from '#/views/aiqa/types';

import { computed, ref, watch } from 'vue';

import { defineStore } from 'pinia';

export interface Conversation {
  id: string;
  title: string;
  picked: PickedSourceTarget | null;
  messages: ChatMessage[];
  /** 后端返回的会话 id；resumeContext / 多轮上下文需要它 */
  conversationId?: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'aiqa:chat';
const MAX_CONVERSATIONS = 50;
const TITLE_MAX_LEN = 24;

interface PersistedShape {
  conversations: Conversation[];
  activeId: string | null;
  version: number;
}

function uid(prefix = 'conv') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function deriveTitle(text: string): string {
  const t = (text || '').trim().replaceAll(/\s+/g, ' ');
  if (!t) return '新对话';
  return t.length > TITLE_MAX_LEN ? `${t.slice(0, TITLE_MAX_LEN)}…` : t;
}

function loadFromStorage(): PersistedShape | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedShape;
    if (!parsed || !Array.isArray(parsed.conversations)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveToStorage(data: PersistedShape) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage 满 / 隐私模式：忽略，store 依旧在内存中可用
  }
}

export const useAiqaChatStore = defineStore('aiqa-chat', () => {
  const conversations = ref<Conversation[]>([]);
  const activeId = ref<string | null>(null);

  const persisted = loadFromStorage();
  if (persisted) {
    conversations.value = persisted.conversations;
    activeId.value = persisted.activeId;
  }

  const activeConversation = computed<Conversation | null>(() => {
    if (!activeId.value) return null;
    return conversations.value.find((c) => c.id === activeId.value) ?? null;
  });

  // 列表按 updatedAt 倒序展示，保证最近活跃的在最上
  const sortedConversations = computed(() =>
    [...conversations.value].sort((a, b) => b.updatedAt - a.updatedAt),
  );

  function trimToLimit() {
    if (conversations.value.length <= MAX_CONVERSATIONS) return;
    const sorted = [...conversations.value].sort(
      (a, b) => a.updatedAt - b.updatedAt,
    );
    const removeCount = conversations.value.length - MAX_CONVERSATIONS;
    const toRemoveIds = new Set(sorted.slice(0, removeCount).map((c) => c.id));
    conversations.value = conversations.value.filter(
      (c) => !toRemoveIds.has(c.id),
    );
    if (activeId.value && toRemoveIds.has(activeId.value)) {
      activeId.value = sortedConversations.value[0]?.id ?? null;
    }
  }

  function touch(conv: Conversation) {
    conv.updatedAt = Date.now();
  }

  function createConversation(picked: PickedSourceTarget | null = null): Conversation {
    const now = Date.now();
    const conv: Conversation = {
      id: uid(),
      title: '新对话',
      picked,
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    conversations.value.unshift(conv);
    activeId.value = conv.id;
    trimToLimit();
    return conv;
  }

  function setActive(id: string) {
    const exists = conversations.value.some((c) => c.id === id);
    if (exists) activeId.value = id;
  }

  function deleteConversation(id: string) {
    const idx = conversations.value.findIndex((c) => c.id === id);
    if (idx < 0) return;
    conversations.value.splice(idx, 1);
    if (activeId.value === id) {
      activeId.value = sortedConversations.value[0]?.id ?? null;
    }
  }

  function renameConversation(id: string, title: string) {
    const conv = conversations.value.find((c) => c.id === id);
    if (!conv) return;
    const next = (title || '').trim();
    if (!next) return;
    conv.title = next.length > TITLE_MAX_LEN ? `${next.slice(0, TITLE_MAX_LEN)}…` : next;
    touch(conv);
  }

  function clearAll() {
    conversations.value = [];
    activeId.value = null;
  }

  function setPicked(id: string, picked: PickedSourceTarget | null) {
    const conv = conversations.value.find((c) => c.id === id);
    if (!conv) return;
    conv.picked = picked;
    touch(conv);
  }

  function setConversationId(id: string, serverConvId: string) {
    const conv = conversations.value.find((c) => c.id === id);
    if (!conv) return;
    conv.conversationId = serverConvId;
  }

  /**
   * 把外部 reactive(ChatMessage) 直接挂进来。
   * useAiChat 后续仍然要在这条 message 上做 chunk 流式更新，
   * 因此调用方传进来时必须是 reactive() 包过的对象。
   */
  function appendMessage(id: string, message: ChatMessage) {
    const conv = conversations.value.find((c) => c.id === id);
    if (!conv) return;
    conv.messages.push(message);
    if (conv.title === '新对话' && message.role === 'user' && message.content) {
      conv.title = deriveTitle(message.content);
    }
    touch(conv);
  }

  function clearMessages(id: string) {
    const conv = conversations.value.find((c) => c.id === id);
    if (!conv) return;
    conv.messages = [];
    conv.conversationId = undefined;
    conv.title = '新对话';
    touch(conv);
  }

  function ensureActiveConversation(
    picked: PickedSourceTarget | null = null,
  ): Conversation {
    if (activeConversation.value) {
      if (picked && !activeConversation.value.picked) {
        activeConversation.value.picked = picked;
      }
      return activeConversation.value;
    }
    return createConversation(picked);
  }

  // 任意写入都自动同步到 localStorage；deep 是必须的，
  // 因为流式回答会 mutate message.content / message.thinking
  watch(
    [conversations, activeId],
    () => {
      saveToStorage({
        version: 1,
        conversations: conversations.value,
        activeId: activeId.value,
      });
    },
    { deep: true },
  );

  return {
    conversations,
    activeId,
    activeConversation,
    sortedConversations,
    createConversation,
    setActive,
    deleteConversation,
    renameConversation,
    clearAll,
    setPicked,
    setConversationId,
    appendMessage,
    clearMessages,
    ensureActiveConversation,
  };
});
