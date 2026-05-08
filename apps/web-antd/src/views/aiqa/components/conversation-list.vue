<script lang="ts" setup>
import type { Conversation } from '#/store/aiqa-chat';

import { computed, ref } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, Input, Modal, Tooltip } from 'ant-design-vue';
import { storeToRefs } from 'pinia';

import { useAiqaChatStore } from '#/store/aiqa-chat';

defineOptions({ name: 'AiqaConversationList' });

const emit = defineEmits<{
  (e: 'new-chat'): void;
  (e: 'select', id: string): void;
}>();

const store = useAiqaChatStore();
const { sortedConversations, activeId } = storeToRefs(store);

const collapsed = ref(false);
const renamingId = ref<string | null>(null);
const renameDraft = ref('');

function onNewChat() {
  emit('new-chat');
}

function onSelect(id: string) {
  if (renamingId.value === id) return;
  emit('select', id);
}

function startRename(conv: Conversation, e: Event) {
  e.stopPropagation();
  renamingId.value = conv.id;
  renameDraft.value = conv.title;
}

function commitRename() {
  if (!renamingId.value) return;
  const id = renamingId.value;
  const next = renameDraft.value.trim();
  if (next) store.renameConversation(id, next);
  renamingId.value = null;
  renameDraft.value = '';
}

function cancelRename() {
  renamingId.value = null;
  renameDraft.value = '';
}

function confirmDelete(conv: Conversation, e: Event) {
  e.stopPropagation();
  Modal.confirm({
    title: '删除该对话？',
    content: `「${conv.title}」中的所有消息将一并删除，操作不可撤销。`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => {
      store.deleteConversation(conv.id);
    },
  });
}

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)} 天前`;
  return new Date(ts).toLocaleDateString();
}

const isEmpty = computed(() => sortedConversations.value.length === 0);
</script>

<template>
  <aside class="conv-list" :class="{ 'conv-list--collapsed': collapsed }">
    <div class="conv-list__header">
      <Button
        v-if="!collapsed"
        type="primary"
        block
        class="conv-list__new"
        @click="onNewChat"
      >
        <template #icon><IconifyIcon icon="ant-design:plus-outlined" /></template>
        新建对话
      </Button>
      <Tooltip v-else title="新建对话" placement="right">
        <Button class="conv-list__new-icon" @click="onNewChat">
          <template #icon><IconifyIcon icon="ant-design:plus-outlined" /></template>
        </Button>
      </Tooltip>
      <Tooltip
        :title="collapsed ? '展开历史栏' : '折叠历史栏'"
        placement="right"
      >
        <button
          class="conv-list__toggle"
          type="button"
          @click="collapsed = !collapsed"
        >
          <IconifyIcon
            :icon="
              collapsed
                ? 'ant-design:menu-unfold-outlined'
                : 'ant-design:menu-fold-outlined'
            "
          />
        </button>
      </Tooltip>
    </div>

    <div v-if="!collapsed" class="conv-list__body">
      <div v-if="isEmpty" class="conv-list__empty">
        还没有历史对话。<br />点击上方「新建对话」开始。
      </div>
      <ul v-else class="conv-list__items">
        <li
          v-for="conv in sortedConversations"
          :key="conv.id"
          class="conv-item"
          :class="{ 'conv-item--active': conv.id === activeId }"
          @click="onSelect(conv.id)"
        >
          <div class="conv-item__main">
            <Input
              v-if="renamingId === conv.id"
              v-model:value="renameDraft"
              size="small"
              autofocus
              :max-length="40"
              @click.stop
              @blur="commitRename"
              @keyup.enter="commitRename"
              @keyup.esc="cancelRename"
            />
            <div v-else class="conv-item__title" :title="conv.title">
              {{ conv.title }}
            </div>
            <div class="conv-item__meta">
              <span v-if="conv.picked" class="conv-item__tag">
                {{ conv.picked.source.type }} → {{ conv.picked.target.type }}
              </span>
              <span class="conv-item__time">{{ relTime(conv.updatedAt) }}</span>
            </div>
          </div>
          <div class="conv-item__actions">
            <Tooltip title="重命名" placement="top">
              <button
                type="button"
                class="conv-item__btn"
                @click="(e) => startRename(conv, e)"
              >
                <IconifyIcon icon="ant-design:edit-outlined" />
              </button>
            </Tooltip>
            <Tooltip title="删除" placement="top">
              <button
                type="button"
                class="conv-item__btn conv-item__btn--danger"
                @click="(e) => confirmDelete(conv, e)"
              >
                <IconifyIcon icon="ant-design:delete-outlined" />
              </button>
            </Tooltip>
          </div>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.conv-list {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 260px;
  height: 100%;
  overflow: hidden;
  background: #fafbfc;
  border-right: 1px solid #eef0f3;
  transition: width 0.2s ease;
}

.conv-list--collapsed {
  width: 56px;
}

.conv-list__header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #eef0f3;
}

.conv-list--collapsed .conv-list__header {
  flex-direction: column;
  padding: 12px 8px;
}

.conv-list__new {
  flex: 1;
}

.conv-list__new-icon {
  width: 40px;
  height: 32px;
  padding: 0;
}

.conv-list__toggle {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.55);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;
  transition: background 0.15s ease;
}

.conv-list__toggle:hover {
  color: rgba(0, 0, 0, 0.88);
  background: #eef0f3;
}

.conv-list__body {
  flex: 1;
  overflow-y: auto;
}

.conv-list__empty {
  padding: 32px 16px;
  font-size: 12px;
  line-height: 1.7;
  color: rgba(0, 0, 0, 0.4);
  text-align: center;
}

.conv-list__items {
  padding: 6px;
  margin: 0;
  list-style: none;
}

.conv-item {
  position: relative;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 10px 10px 10px 12px;
  margin-bottom: 4px;
  cursor: pointer;
  border-radius: 8px;
  transition: background 0.12s ease;
}

.conv-item:hover {
  background: #eef4ff;
}

.conv-item--active {
  background: #e1ecff;
}

.conv-item--active::before {
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 4px;
  width: 3px;
  content: '';
  background: #1677ff;
  border-radius: 2px;
}

.conv-item__main {
  flex: 1;
  min-width: 0;
}

.conv-item__title {
  overflow: hidden;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.85);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conv-item--active .conv-item__title {
  color: #1677ff;
}

.conv-item__meta {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.45);
}

.conv-item__tag {
  padding: 1px 6px;
  background: #fff;
  border: 1px solid #e8edf5;
  border-radius: 999px;
}

.conv-item__time {
  flex-shrink: 0;
}

.conv-item__actions {
  display: none;
  flex-shrink: 0;
  gap: 2px;
  align-items: center;
}

.conv-item:hover .conv-item__actions,
.conv-item--active .conv-item__actions {
  display: inline-flex;
}

.conv-item__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.55);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 4px;
}

.conv-item__btn:hover {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.1);
}

.conv-item__btn--danger:hover {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.1);
}
</style>
