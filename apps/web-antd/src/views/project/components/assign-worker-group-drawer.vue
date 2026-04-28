<script lang="ts" setup>
import type { ProjectWorkerGroupItem } from '#/api/project';

import { ref } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';

import {
  Card,
  Checkbox,
  Empty,
  message,
  Spin,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import {
  assignProjectWorkerGroups,
  getProjectWorkerGroups,
  getWorkerGroupsAll,
} from '#/api/project';

defineOptions({ name: 'AssignWorkerGroupDrawer' });

const emit = defineEmits<{
  success: [];
}>();

const [Drawer, drawerApi] = useVbenDrawer({
  onConfirm: handleConfirm,
  onOpenChange: handleOpenChange,
});

const projectCode = ref<number>(0);
const projectName = ref('');
const loading = ref(false);
const sortedWorkerGroups = ref<string[]>([]);
const selectedWorkerGroups = ref<string[]>([]);

async function handleOpenChange(isOpen: boolean) {
  if (isOpen) {
    const data = drawerApi.getData<{
      projectCode: number;
      projectName: string;
    }>();
    projectCode.value = data?.projectCode || 0;
    projectName.value = data?.projectName || '';
    await fetchWorkerGroups();
  }
}

async function fetchWorkerGroups() {
  loading.value = true;
  try {
    const [allGroupsRes, projectGroupsRes] = await Promise.all([
      getWorkerGroupsAll(),
      getProjectWorkerGroups(projectCode.value),
    ]);
    const allGroups = (allGroupsRes || []).map((name: string) => name);
    const assignedGroups = (projectGroupsRes || []).map(
      (item: ProjectWorkerGroupItem) => item.workerGroup,
    );
    selectedWorkerGroups.value = [...assignedGroups];
    const assigned = allGroups.filter(g => assignedGroups.includes(g));
    const unassigned = allGroups.filter(g => !assignedGroups.includes(g));
    sortedWorkerGroups.value = [...assigned, ...unassigned];
  } catch (error) {
    console.error('fetchWorkerGroups error:', error);
    message.error('获取工作组列表失败');
  } finally {
    loading.value = false;
  }
}

function handleSelectAll(checked: boolean) {
  selectedWorkerGroups.value = checked ? [...sortedWorkerGroups.value] : [];
}

function handleSelectGroup(group: string, checked: boolean) {
  if (checked) {
    selectedWorkerGroups.value.push(group);
  } else {
    const idx = selectedWorkerGroups.value.indexOf(group);
    if (idx > -1) {
      selectedWorkerGroups.value.splice(idx, 1);
    }
  }
}

async function handleConfirm() {
  if (selectedWorkerGroups.value.length === 0) {
    message.warning('请至少选择一个工作组');
    return;
  }

  loading.value = true;
  try {
    await assignProjectWorkerGroups(projectCode.value, selectedWorkerGroups.value);
    message.success('分配成功');
    drawerApi.close();
    emit('success');
  } catch (error) {
    console.error('assignProjectWorkerGroups error:', error);
    message.error('分配失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <Drawer :title="`分配工作组 - ${projectName}`" class="w-[550px]">
    <Spin :spinning="loading">
      <Card size="small" :bordered="false">
        <template #title>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <IconifyIcon icon="ant-design:cluster-outlined" class="text-lg" />
              <span>工作组列表</span>
            </div>
            <Checkbox
              :checked="sortedWorkerGroups.length > 0 && sortedWorkerGroups.every(g => selectedWorkerGroups.includes(g))"
              @change="(e) => handleSelectAll(e.target.checked)"
            >
              全选
            </Checkbox>
          </div>
        </template>

        <div class="mb-3 flex items-center justify-between text-sm text-gray-500">
          <span>点击工作组名称可进行选择</span>
          <span>
            已选择 <span class="font-medium text-primary">{{ selectedWorkerGroups.length }}</span> / {{ sortedWorkerGroups.length }} 个
          </span>
        </div>

        <div class="max-h-[350px] overflow-y-auto pr-2">
          <div v-if="sortedWorkerGroups.length === 0">
            <Empty description="暂无工作组数据" />
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="group in sortedWorkerGroups"
              :key="group"
              :class="[
                'group flex cursor-pointer items-center justify-between rounded-lg border p-3 transition-all duration-200',
                selectedWorkerGroups.includes(group)
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
              ]"
              @click="handleSelectGroup(group, !selectedWorkerGroups.includes(group))"
            >
              <div class="flex items-center gap-3">
                <Checkbox
                  :checked="selectedWorkerGroups.includes(group)"
                  @change="(e) => handleSelectGroup(group, e.target.checked)"
                  @click.stop
                />
                <span :class="['text-sm', selectedWorkerGroups.includes(group) ? 'font-medium text-primary' : '']">
                  {{ group }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Spin>
  </Drawer>
</template>
