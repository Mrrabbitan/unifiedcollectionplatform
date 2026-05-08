<script lang="ts" setup>
import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Dropdown, Menu, Modal, Tag } from 'ant-design-vue';

import { useApiEnvStore, type ApiEnv } from '#/store';

defineOptions({ name: 'ApiEnvSwitcher' });

const envStore = useApiEnvStore();

const isProd = computed(() => envStore.current === 'prod');
const tagColor = computed(() => (isProd.value ? 'red' : 'blue'));
const labelText = computed(() =>
  isProd.value ? '生产 10.177.56.196' : '本地 mock',
);
const triggerIcon = computed(() =>
  isProd.value ? 'lucide:server' : 'lucide:laptop',
);

function handleSwitch(target: ApiEnv) {
  if (target === envStore.current) return;
  Modal.confirm({
    title: target === 'prod' ? '切换到生产环境？' : '切换到本地 mock？',
    content:
      target === 'prod'
        ? '页面将自动刷新，所有 API 请求会被转发到 10.177.56.196:8087（生产）。本地 mock 的登录态在生产环境会失效，可能会跳转到登录页。'
        : '页面将自动刷新，所有 API 请求回到本地 Nitro mock（localhost:5320）。',
    okText: '确认切换',
    cancelText: '取消',
    okButtonProps: target === 'prod' ? { danger: true } : undefined,
    onOk: () => envStore.switchTo(target),
  });
}
</script>

<template>
  <Dropdown :trigger="['click']">
    <a
      class="env-switch-trigger"
      :class="{ 'env-switch-trigger--prod': isProd }"
      @click.prevent
    >
      <IconifyIcon :icon="triggerIcon" :style="{ fontSize: '16px' }" />
      <Tag :color="tagColor" class="!m-0 env-switch-tag">
        {{ labelText }}
      </Tag>
    </a>
    <template #overlay>
      <Menu @click="(e: any) => handleSwitch(e.key as ApiEnv)">
        <Menu.Item key="mock" class="env-menu-item">
          <IconifyIcon icon="lucide:laptop" :style="{ fontSize: '14px' }" />
          <span class="env-menu-item__label">本地 mock</span>
          <span class="env-menu-item__hint">localhost:5320</span>
          <Tag v-if="!isProd" color="blue" class="!m-0 !ml-2">当前</Tag>
        </Menu.Item>
        <Menu.Item key="prod" class="env-menu-item">
          <IconifyIcon icon="lucide:server" :style="{ fontSize: '14px' }" />
          <span class="env-menu-item__label">生产 10.177.56.196:8087</span>
          <span class="env-menu-item__hint">需重新登录</span>
          <Tag v-if="isProd" color="red" class="!m-0 !ml-2">当前</Tag>
        </Menu.Item>
      </Menu>
    </template>
  </Dropdown>
</template>

<style scoped>
.env-switch-trigger {
  position: relative;
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 4px 8px;
  color: inherit;
  cursor: pointer;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.env-switch-trigger:hover {
  background-color: rgb(0 0 0 / 4%);
}

/* 生产环境：红色脉冲提醒「你正在打生产」，避免误操作 */
.env-switch-trigger--prod::before {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  content: '';
  background: #ef4444;
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgb(239 68 68 / 60%);
  animation: env-prod-pulse 1.6s ease-in-out infinite;
}

@keyframes env-prod-pulse {
  0% { box-shadow: 0 0 0 0 rgb(239 68 68 / 60%); }
  70% { box-shadow: 0 0 0 8px rgb(239 68 68 / 0%); }
  100% { box-shadow: 0 0 0 0 rgb(239 68 68 / 0%); }
}

.env-switch-tag {
  font-size: 12px;
  line-height: 18px;
}

.env-menu-item {
  display: flex !important;
  gap: 6px;
  align-items: center;
  min-width: 240px;
}

.env-menu-item__label {
  flex: 1;
  font-size: 13px;
}

.env-menu-item__hint {
  font-size: 11px;
  color: #9ca3af;
}
</style>
