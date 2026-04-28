<script lang="ts" setup>
import { Tag } from 'ant-design-vue';

defineOptions({ name: 'AiAssistantQuickPrompts' });

defineEmits<{
  (e: 'select', text: string): void;
}>();

const prompts = [
  '创建一个从 MySQL 到 MaxCompute 的每日批量同步任务',
  '把订单库 order 表实时 CDC 同步到 PostgreSQL',
  '6836946 这个故事，把 user 表实时同步到目标库',
  '从 SFTP 文件每日批量采集到 MaxCompute',
];
</script>

<template>
  <div class="ai-quick-prompts">
    <span class="ai-quick-prompts__label">快捷模板：</span>
    <Tag
      v-for="prompt in prompts"
      :key="prompt"
      class="ai-quick-prompts__item"
      color="purple"
      @click="$emit('select', prompt)"
    >
      {{ prompt }}
    </Tag>
  </div>
</template>

<style scoped>
.ai-quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  padding: 6px 10px;
  background: #faf5ff;
  border-bottom: 1px solid #ede9fe;
}

.ai-quick-prompts__label {
  font-size: 12px;
  color: #6b7280;
}

.ai-quick-prompts__item {
  margin: 0 !important;
  font-size: 12px;
  cursor: pointer;
  user-select: none;
}
</style>
