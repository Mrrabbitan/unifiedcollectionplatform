<script lang="ts" setup>
import type { ActionItem } from '../types';

import { useRouter } from 'vue-router';

defineOptions({ name: 'AiqaActionTrace' });

const props = defineProps<{
  actions: ActionItem[];
}>();

const router = useRouter();

function statusLabel(s: ActionItem['status']) {
  switch (s) {
    case 'fail': {
      return '失败';
    }
    case 'pending': {
      return '待执行';
    }
    case 'running': {
      return '执行中';
    }
    case 'success': {
      return '完成';
    }
    default: {
      return '';
    }
  }
}

function statusIcon(s: ActionItem['status']) {
  switch (s) {
    case 'fail': {
      return '✕';
    }
    case 'pending': {
      return '·';
    }
    case 'running': {
      return '⟳';
    }
    case 'success': {
      return '✓';
    }
    default: {
      return '·';
    }
  }
}

function jumpTo(to: string) {
  router.push(to);
}
</script>

<template>
  <div v-if="props.actions.length > 0" class="action-trace">
    <div class="action-trace__header">⚙ 执行轨迹</div>
    <ol class="action-trace__list">
      <li
        v-for="(a, idx) in props.actions"
        :key="a.id"
        class="action-trace__item"
        :class="`action-trace__item--${a.status}`"
      >
        <span class="action-trace__num">
          <span class="action-trace__icon">{{ statusIcon(a.status) }}</span>
        </span>
        <div class="action-trace__body">
          <div class="action-trace__step">
            {{ idx + 1 }}. {{ a.step }}
            <span class="action-trace__status">{{ statusLabel(a.status) }}</span>
          </div>
          <div v-if="a.error" class="action-trace__error">{{ a.error }}</div>
          <div v-if="a.payload?.endpoint" class="action-trace__meta">
            调用 <code>{{ a.payload.endpoint }}</code>
          </div>
          <div
            v-if="a.status === 'success' && a.result?.id"
            class="action-trace__meta"
          >
            返回 ID:
            <code>{{ a.result.id ?? a.result.code ?? '-' }}</code>
          </div>
          <div v-if="a.payload?.link" class="action-trace__link">
            <a @click="jumpTo(a.payload.link.to)">{{ a.payload.link.label }} →</a>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.action-trace {
  padding: 10px 14px;
  margin-top: 12px;
  background: #fafbfc;
  border: 1px solid #eef0f3;
  border-radius: 8px;
}

.action-trace__header {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

.action-trace__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.action-trace__item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 6px 0;
}

.action-trace__num {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  background: #e5e7eb;
  border-radius: 50%;
}

.action-trace__icon {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.action-trace__item--pending .action-trace__num {
  background: #d1d5db;
}

.action-trace__item--running .action-trace__num {
  background: #1677ff;
  animation: spin 1.2s linear infinite;
}

.action-trace__item--success .action-trace__num {
  background: #16a34a;
}

.action-trace__item--fail .action-trace__num {
  background: #dc2626;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.action-trace__body {
  flex: 1;
  font-size: 13px;
  line-height: 1.5;
}

.action-trace__step {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.action-trace__status {
  margin-left: 8px;
  font-size: 11px;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.45);
}

.action-trace__meta {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
}

.action-trace__meta code {
  padding: 1px 4px;
  margin: 0 2px;
  font-size: 11px;
  background: #f1f5f9;
  border-radius: 3px;
}

.action-trace__error {
  margin-top: 2px;
  font-size: 12px;
  color: #dc2626;
}

.action-trace__link {
  margin-top: 4px;
  font-size: 12px;
}

.action-trace__link a {
  color: #1677ff;
  cursor: pointer;
}

.action-trace__link a:hover {
  text-decoration: underline;
}
</style>
