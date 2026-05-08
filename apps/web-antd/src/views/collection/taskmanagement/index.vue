<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import type { WorkflowItem } from '#/api/taskmanagement';

import { onMounted, onActivated, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, Card, message, Popconfirm, Space, Tag, Tooltip } from 'ant-design-vue';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  ScheduleOutlined,
} from '@ant-design/icons-vue';

import {
  getWorkflowList,
  releaseWorkflow,
  copyWorkflow,
  deleteWorkflow,
  onlineSchedule,
  offlineSchedule,
  getWorkflowTaskTypeData,
} from '#/api/taskmanagement';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useProjectStore } from '#/store';

import CreateTaskModal from './components/create-task-modal.vue';
import ScheduleModal from './components/schedule-modal.vue';
import StartModal from './components/start-modal.vue';

defineOptions({ name: 'TaskManagement' });

const projectStore = useProjectStore();
const router = useRouter();

const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
});

const searchForm = reactive({
  projectCode: undefined as number | undefined,
  workflowName: '',
});

const formOptions: VbenFormProps = {
  collapsed: false,
  actionLayout: 'rowEnd',
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入任务名称',
        allowClear: true,
      },
      fieldName: 'workflowName',
      label: '任务名称',
    },
  ],
  showCollapseButton: false,
  submitButtonOptions: {
    content: '查询',
  },
  handleSubmit: async (values) => {
    searchForm.workflowName = values.workflowName || '';
    gridApi.reload();
  },
  handleReset: async () => {
    searchForm.workflowName = '';
    gridApi.formApi.resetForm();
    gridApi.reload();
  },
};

const gridOptions: VxeTableGridOptions<WorkflowItem> = {
  stripe: true,
  columns: [
    { title: '#', type: 'seq', width: 60 },
    {
      field: 'name',
      title: '任务名称',
      minWidth: 180,
    },
    {
      field: 'taskType',
      title: '任务类型',
      width: 160,
      align: 'center',
      slots: { default: 'taskType' },
    },
    {
      field: 'releaseState',
      title: '状态',
      width: 100,
      align: 'center',
      slots: { default: 'releaseState' },
    },
    {
      field: 'userName',
      title: '创建用户',
      width: 120,
    },
    {
      field: 'description',
      title: '描述',
      minWidth: 160,
    },
    {
      field: 'createTime',
      title: '创建时间',
      width: 160,
    },
    {
      field: 'updateTime',
      title: '更新时间',
      width: 160,
    },
    {
      field: 'modifyBy',
      title: '修改人',
      width: 120,
    },
    {
      title: '操作',
      width: 280,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  pagerConfig: {
    enabled: true,
    currentPage: 1,
    pageSize: 10,
    pageSizes: [10, 20, 50, 100],
    total: 0,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        const projectCode = projectStore.currentProjectCode;
        if (!projectCode) {
          return {
            items: [],
            total: 0,
          };
        }
        try {
          const res = await getWorkflowList(projectCode, {
            searchVal: searchForm.workflowName || undefined,
            pageNo: page.currentPage,
            pageSize: page.pageSize,
          });
          return {
            items: res.totalList || [],
            total: res.total || 0,
          };
        } catch {
          message.error('获取任务列表失败');
          return {
            items: [],
            total: 0,
          };
        }
      },
    },
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    resizable: true,
    zoom: true,
  },
  columnConfig: {
    resizable: true,
  },
};

const [Grid, gridApi] = useVbenVxeGrid<WorkflowItem>({
  formOptions,
  gridOptions,
});

watch(() => projectStore.currentProjectCode, () => {
  gridApi.reload();
});

onActivated(() => {
  const refreshFlag = sessionStorage.getItem('taskmanagement_refresh');
  if (refreshFlag) {
    sessionStorage.removeItem('taskmanagement_refresh');
    gridApi.reload();
  }
});

const [CreateModal, createModalApi] = useVbenModal({
  connectedComponent: CreateTaskModal,
});

const [ScheduleModalComp, scheduleModalApi] = useVbenModal({
  connectedComponent: ScheduleModal,
  onClosed() {
    gridApi.reload();
  },
});

const [StartModalComp, startModalApi] = useVbenModal({
  connectedComponent: StartModal,
});

function handleAdd() {
  createModalApi.open();
}

function getReleaseStateTag(state: string) {
  const stateMap: Record<string, { color: string; text: string }> = {
    ONLINE: { color: 'success', text: '上线' },
    OFFLINE: { color: 'default', text: '下线' },
  };
  return stateMap[state] || { color: 'default', text: state };
}

function getTaskTypeInfo(taskType?: string) {
  const taskTypeMap: Record<string, { color: string; text: string }> = {
    structuredBatch: { color: 'blue', text: '批量采集结构化' },
    unStructuredBatch: { color: 'green', text: '批量采集非结构化' },
    stream: { color: 'orange', text: '实时采集' },
    streamCDC: { color: 'purple', text: 'CDC采集' },
  };
  return taskType ? taskTypeMap[taskType] || { color: 'default', text: '未知类型' } : { color: 'default', text: '未知类型' };
}

async function handleToggleOnline(row: WorkflowItem) {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  const isOnline = row.releaseState === 'ONLINE';
  try {
    await releaseWorkflow(projectCode, row.code, {
      name: row.name,
      releaseState: isOnline ? 'OFFLINE' : 'ONLINE',
    });
    message.success(isOnline ? '下线成功' : '上线成功');
    gridApi.reload();
  } catch {
    message.error(isOnline ? '下线失败' : '上线失败');
  }
}

async function handleEdit(row: WorkflowItem) {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  
  if (row.releaseState === 'ONLINE') {
    message.warning('上线状态的任务不能编辑，请先下线');
    return;
  }
  
  const taskType = row.taskType || 'structuredBatch';
  const routeMap: Record<string, string> = {
    structuredBatch: '/collection/structuredbatch',
    unStructuredBatch: '/collection/unstructuredbatch',
    stream: '/collection/stream',
    streamCDC: '/collection/streamcdc',
  };
  const targetRoute = routeMap[taskType] || '/collection/structuredbatch';
  
  try {
    router.push({
      path: targetRoute,
      query: {
        code: String(row.code),
        taskType: taskType,
      },
    });
  } catch (error: any) {
    message.error(error?.message || '获取任务数据失败，无法编辑');
  }
}

function handleStart(row: WorkflowItem) {
  startModalApi.setData(row).open();
}

function handleSchedule(row: WorkflowItem) {
  scheduleModalApi.setData(row).open();
}

async function handleToggleScheduleOnline(row: WorkflowItem) {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  
  if (row.releaseState !== 'ONLINE') {
    message.error('当前任务未上线');
    return;
  }
  
  const scheduleId = row.schedule?.id;
  if (!scheduleId) {
    message.error('未找到定时任务ID');
    return;
  }
  const isOnline = row.scheduleReleaseState === 'ONLINE';
  try {
    if (isOnline) {
      await offlineSchedule(projectCode, scheduleId);
      message.success('定时任务下线成功');
    } else {
      await onlineSchedule(projectCode, scheduleId);
      message.success('定时任务上线成功');
    }
    gridApi.reload();
  } catch {
    message.error(isOnline ? '定时任务下线失败' : '定时任务上线失败');
  }
}

async function handleCopy(row: WorkflowItem) {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  try {
    await copyWorkflow(projectCode, row.code, projectCode, row.taskType);
    message.success('复制任务成功');
    gridApi.reload();
  } catch {
    message.error('复制任务失败');
  }
}

async function handleDelete(row: WorkflowItem) {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  try {
    await deleteWorkflow(projectCode, row.code);
    message.success('删除成功');
    gridApi.reload();
  } catch {
    message.error('删除失败');
  }
}
</script>

<template>
  <Page
    auto-content-height
    title="采集任务管理"
    description="管理所有采集任务，支持按项目、任务名称、状态、创建用户进行搜索"
  >
    <Card class="task-card">
      <Grid table-title="任务列表" table-title-help="支持列宽拖动">
        <template #toolbar-tools>
          <Button type="primary" @click="handleAdd">新建任务</Button>
        </template>
        <template #releaseState="{ row }">
          <Tag :color="getReleaseStateTag(row.releaseState).color">
            {{ getReleaseStateTag(row.releaseState).text }}
          </Tag>
        </template>
        <template #taskType="{ row }">
          <Tag :color="getTaskTypeInfo(row.taskType).color">
            {{ getTaskTypeInfo(row.taskType).text }}
          </Tag>
        </template>
        <template #action="{ row }">
          <Space size="small" wrap class="action-buttons">
            <Tooltip :title="row.releaseState === 'ONLINE' ? '上线状态不可编辑' : '编辑'">
              <Button size="large" type="link" :disabled="row.releaseState === 'ONLINE'" @click="handleEdit(row)">
                <template #icon><EditOutlined /></template>
              </Button>
            </Tooltip>
            <Tooltip :title="row.releaseState === 'ONLINE' ? '下线' : '上线'">
              <Button
                size="large"
                type="link"
                @click="handleToggleOnline(row)"
              >
                <template #icon>
                  <ArrowDownOutlined v-if="row.releaseState === 'ONLINE'" />
                  <ArrowUpOutlined v-else />
                </template>
              </Button>
            </Tooltip>
            <Tooltip title="启动">
              <Button size="large" type="link" :disabled="row.releaseState !== 'ONLINE'" @click="handleStart(row)">
                <template #icon><PlayCircleOutlined /></template>
              </Button>
            </Tooltip>
            <Tooltip title="定时">
              <Button size="large" type="link" @click="handleSchedule(row)">
                <template #icon><ClockCircleOutlined /></template>
              </Button>
            </Tooltip>
            <Tooltip :title="row.scheduleReleaseState === 'ONLINE' ? '定时任务下线' : '定时任务上线'">
              <Button size="large" type="link" :disabled="!row.schedule || row.releaseState !== 'ONLINE'" @click="handleToggleScheduleOnline(row)">
                <template #icon>
                  <PauseCircleOutlined v-if="row.scheduleReleaseState === 'ONLINE'" />
                  <ScheduleOutlined v-else />
                </template>
              </Button>
            </Tooltip>
            <Tooltip title="复制任务">
              <Button size="large" type="link" @click="handleCopy(row)">
                <template #icon><CopyOutlined /></template>
              </Button>
            </Tooltip>
            <Popconfirm
              title="确定要删除此任务吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleDelete(row)"
            >
              <Tooltip title="删除">
                <Button size="large" type="link" danger>
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        </template>
      </Grid>
    </Card>
    <CreateModal />
    <ScheduleModalComp @success="gridApi.reload()" />
    <StartModalComp @success="gridApi.reload()" />
  </Page>
</template>

<style scoped>
.task-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.ant-card-body) {
  padding: 8px !important;
}

:deep(.vxe-grid) {
  height: 100% !important;
}

:deep(.vxe-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.vxe-table--header-wrapper) {
  border-radius: 8px 8px 0 0;
}

:deep(.vxe-table--main-wrapper) {
  height: 100% !important;
}

:deep(.vxe-table--body-wrapper) {
  overflow-y: auto !important;
  border-radius: 0 0 8px 8px;
}

:deep(.vxe-table--render-default .vxe-body--row:nth-child(even)) {
  background-color: #fafafa;
}

.vxe-table:not([data-calc-col]) .vxe-cell--wrapper {
  min-width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-buttons {
  align-items: center;
  justify-content: center;
  display: flex !important;
  flex-wrap: nowrap !important;
  gap: 0px !important;
  margin-bottom: 0 !important;
}

.action-buttons :deep(.ant-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  height: auto;
  line-height: 1;
  min-width: auto;
  min-height: 24px;
}

.action-buttons :deep(.ant-btn .anticon) {
  font-size: 16px;
  line-height: 1;
}
</style>
