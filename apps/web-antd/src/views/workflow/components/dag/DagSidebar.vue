<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';

import { Collapse, CollapsePanel, Spin } from 'ant-design-vue';

import { getDagMenu } from '#/api/workflow';

import type { TaskMenuItem, TaskType } from './types';
import { TASK_CATEGORY_LABELS, TASK_TYPE_LABELS } from './types';
import { TASK_COLORS } from './config';

const emit = defineEmits<{
  dragStart: [e: DragEvent, type: TaskType];
}>();

const loading = ref(false);
const menuData = ref<TaskMenuItem[]>([]);
const activeKeys = ref<string[]>([]);

const taskCategories = computed(() => {
  const allowedTypes = ['SQL', 'REMOTESHELL'];
  const categoryMap = new Map<string, TaskType[]>();
  
  menuData.value.forEach((item) => {
    if (allowedTypes.includes(item.taskType)) {
      const types = categoryMap.get(item.taskCategory) || [];
      types.push(item.taskType);
      categoryMap.set(item.taskCategory, types);
    }
  });

  return Array.from(categoryMap.entries()).map(([category, types]) => ({
    key: category,
    label: TASK_CATEGORY_LABELS[category] || category,
    types,
  }));
});

function handleDragStart(e: DragEvent, type: TaskType) {
  emit('dragStart', e, type);
}

async function fetchMenuData() {
  loading.value = true;
  try {
    const data = await getDagMenu();
    menuData.value = data;
    activeKeys.value = [...new Set(data.map((item) => item.taskCategory))];
  } catch (error) {
    console.error('Failed to fetch dag menu:', error);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchMenuData();
});
</script>

<template>
  <div class="dag-sidebar">
    <div class="sidebar-header">
      <span class="title">任务组件</span>
    </div>
    <div class="task-collapse-wrapper">
      <Spin :spinning="loading">
        <Collapse v-model:activeKey="activeKeys" :bordered="false" class="task-collapse">
          <CollapsePanel
            v-for="category in taskCategories"
            :key="category.key"
            :header="category.label"
          >
            <div class="task-list">
              <div
                v-for="type in category.types"
                :key="type"
                class="task-item"
                draggable="true"
                @dragstart="handleDragStart($event, type)"
              >
                <div
                  class="task-icon"
                  :style="{ backgroundColor: TASK_COLORS[type] || '#1890FF' }"
                >
                  {{ type.charAt(0) }}
                </div>
                <span class="task-name">{{ TASK_TYPE_LABELS[type] || type }}</span>
              </div>
            </div>
          </CollapsePanel>
        </Collapse>
      </Spin>
    </div>
  </div>
</template>

<style scoped>
.dag-sidebar {
  width: 240px;
  height: 100%;
  background: #fff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.sidebar-header .title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.task-collapse-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.task-collapse {
  height: 100%;
}

.task-collapse :deep(.ant-collapse-content) {
  max-height: none;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: grab;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.task-item:hover {
  background: #f5f5f5;
  border-color: #d9d9d9;
}

.task-item:active {
  cursor: grabbing;
}

.task-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
}

.task-name {
  font-size: 13px;
  color: #333;
}
</style>
