<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import type { WorkflowInstanceItem } from '#/api/taskmonitoring';

import { computed, onActivated, onMounted, reactive, ref, watch } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import {
  Button,
  Card,
  message,
  Modal,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileTextOutlined,
  LoadingOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  StopOutlined,
} from '@ant-design/icons-vue';
import dayjs, { Dayjs } from 'dayjs';

import {
  getWorkflowInstanceList,
  getWorkflowInstanceStateCount,
  execute,
  deleteWorkflowInstance,
} from '#/api/taskmonitoring';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useProjectStore } from '#/store';

import LogModal from './components/log-modal.vue';
import wave1 from './wave1.91ccf6a1.png';
import wave2 from './wave2.1c7ea725.png';
import wave3 from './wave3.3d2c1d9d.png';
import wave4 from './wave4.153cbb19.png';
import wave5 from './wave5.35ec67e6.png';
import wave6 from './wave6.8b85946e.png';

defineOptions({ name: 'TaskMonitoring' });

const projectStore = useProjectStore();

const statisticsData = reactive({
  runningCount: 0,
  successCount: 0,
  failureCount: 0,
  waitingCount: 0,
  pauseCount: 0,
  total: 0,
});

const progressPercent = computed(() => {
  if (statisticsData.total === 0) return 0;
  return Math.round(
    ((statisticsData.successCount + statisticsData.failureCount) /
      statisticsData.total) *
      100,
  );
});

const progressStatus = computed(() => {
  if (statisticsData.failureCount > 0) return 'exception';
  if (progressPercent.value === 100) return 'success';
  return 'active';
});

const statCards = computed(() => [
  {
    key: 'running',
    label: '运行中',
    value: statisticsData.runningCount,
    icon: LoadingOutlined,
    iconBg: 'linear-gradient(153deg, rgb(43, 127, 255), rgb(0, 211, 242))',
    wave: wave1,
  },
  {
    key: 'success',
    label: '成功',
    value: statisticsData.successCount,
    icon: CheckCircleOutlined,
    iconBg: 'linear-gradient(153deg, rgb(0, 188, 125), rgb(0, 213, 190))',
    wave: wave2,
  },
  {
    key: 'failure',
    label: '失败',
    value: statisticsData.failureCount,
    icon: CloseCircleOutlined,
    iconBg: 'linear-gradient(153deg, rgb(251, 44, 54), rgb(255, 99, 126))',
    wave: wave3,
  },
  {
    key: 'waiting',
    label: '等待中',
    value: statisticsData.waitingCount,
    icon: ClockCircleOutlined,
    iconBg: 'linear-gradient(153deg, rgb(254, 154, 0), rgb(255, 137, 4))',
    wave: wave4,
  },
  {
    key: 'pause',
    label: '暂停',
    value: statisticsData.pauseCount,
    icon: PauseCircleOutlined,
    iconBg: 'linear-gradient(153deg, rgb(255, 193, 7), rgb(255, 152, 0))',
    wave: wave6,
  },
  {
    key: 'total',
    label: '总计',
    value: statisticsData.total,
    icon: BarChartOutlined,
    iconBg: 'linear-gradient(153deg, rgb(173, 70, 255), rgb(251, 100, 182))',
    wave: wave5,
  },
]);

const searchForm = reactive({
  searchVal: '',
  executorName: '',
  host: '',
  stateType: undefined as string | undefined,
  dateRange: null as [Dayjs, Dayjs] | null,
});

const stateOptions = [
  { label: '全部状态', value: '' },
  { label: '运行中', value: 'RUNNING_EXECUTION' },
  { label: '成功', value: 'SUCCESS' },
  { label: '失败', value: 'FAILURE' },
  { label: '等待', value: 'WAITING_THREAD' },
  { label: '暂停', value: 'PAUSE' },
  { label: '停止', value: 'STOP' },
];

const formOptions: VbenFormProps = {
  collapsed: false,
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入任务名称',
        allowClear: true,
      },
      fieldName: 'searchVal',
      label: '任务名称',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入执行用户',
        allowClear: true,
      },
      fieldName: 'executorName',
      label: '执行用户',
    },
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入主机',
        allowClear: true,
      },
      fieldName: 'host',
      label: '主机',
    },
    {
      component: 'Select',
      componentProps: {
        placeholder: '请选择状态',
        allowClear: true,
        options: stateOptions,
      },
      fieldName: 'stateType',
      label: '状态',
    },
    {
      component: 'RangePicker',
      componentProps: {
        class: 'w-full',
        placeholder: ['开始时间', '结束时间'],
        showTime: true,
        format: 'YYYY-MM-DD HH:mm:ss',
      },
      fieldName: 'dateRange',
      label: '时间范围',
    },
  ],
  showCollapseButton: false,
  submitButtonOptions: {
    content: '查询',
  },
  handleSubmit: async (values) => {
    searchForm.searchVal = values.searchVal || '';
    searchForm.executorName = values.executorName || '';
    searchForm.host = values.host || '';
    searchForm.stateType = values.stateType || undefined;
    searchForm.dateRange = values.dateRange || null;
    gridApi.reload();
  },
  handleReset: async () => {
    searchForm.searchVal = '';
    searchForm.executorName = '';
    searchForm.host = '';
    searchForm.stateType = undefined;
    searchForm.dateRange = null;
    gridApi.formApi.resetForm();
    gridApi.reload();
  },
};

function getStateTag(state: string) {
  const stateMap: Record<string, { color: string; text: string }> = {
    RUNNING_EXECUTION: { color: 'processing', text: '运行中' },
    SUCCESS: { color: 'success', text: '成功' },
    FAILURE: { color: 'error', text: '失败' },
    WAITING_THREAD: { color: 'default', text: '等待' },
    PAUSE: { color: 'warning', text: '暂停' },
    STOP: { color: 'default', text: '停止' },
  };
  return stateMap[state] || { color: 'default', text: state };
}

function getCommandTypeText(commandType: string) {
  const typeMap: Record<string, string> = {
    START_PROCESS: '手动执行',
    SCHEDULE: '定时调度',
    RECOVER_SUSPENDED_PROCESS: '恢复运行',
    START_FAILURE_TASK_PROCESS: '失败重跑',
    COMPLEMENT_DATA: '补数',
  };
  return typeMap[commandType] || commandType;
}

const gridOptions: VxeTableGridOptions<WorkflowInstanceItem> = {
  stripe: true,
  columns: [
    {
      field: 'name',
      title: '任务名称',
      minWidth: 180,
      showOverflow: true,
    },
    {
      field: 'state',
      title: '状态',
      width: 100,
      slots: { default: 'state' },
    },
    {
      field: 'commandType',
      title: '运行类型',
      width: 100,
      slots: { default: 'commandType' },
    },
    {
      field: 'scheduleTime',
      title: '调度时间',
      width: 160,
    },
    {
      field: 'startTime',
      title: '开始时间',
      width: 160,
    },
    {
      field: 'endTime',
      title: '结束时间',
      width: 160,
    },
    {
      field: 'duration',
      title: '运行时长',
      width: 120,
    },
    {
      field: 'runTimes',
      title: '运行次数',
      width: 100,
    },
    {
      field: 'executorName',
      title: '执行用户',
      width: 100,
    },
    {
      field: 'host',
      title: '主机',
      width: 140,
      showOverflow: true,
    },
    {
      title: '操作',
      width: 240,
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
          const params: any = {
            pageNo: page.currentPage,
            pageSize: page.pageSize,
          };
          if (searchForm.searchVal) params.searchVal = searchForm.searchVal;
          if (searchForm.executorName) params.executorName = searchForm.executorName;
          if (searchForm.host) params.host = searchForm.host;
          if (searchForm.stateType) params.stateType = searchForm.stateType;
          if (searchForm.dateRange && searchForm.dateRange.length === 2) {
            params.startDate = searchForm.dateRange[0].format('YYYY-MM-DD HH:mm:ss');
            params.endDate = searchForm.dateRange[1].format('YYYY-MM-DD HH:mm:ss');
          }

          const res = await getWorkflowInstanceList(projectCode, params);
          return {
            items: res.totalList || [],
            total: res.total || 0,
          };
        } catch {
          message.error('获取任务实例列表失败');
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

async function loadStateStatistics() {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) return;

  try {
    const res = await getWorkflowInstanceStateCount(projectCode);
    const counts = res.workflowInstanceStatusCounts || [];
    
    statisticsData.runningCount = counts.find(c => c.state === 'RUNNING_EXECUTION')?.count || 0;
    statisticsData.successCount = counts.find(c => c.state === 'SUCCESS')?.count || 0;
    statisticsData.failureCount = counts.find(c => c.state === 'FAILURE')?.count || 0;
    statisticsData.waitingCount = (counts.find(c => c.state === 'WAITING_THREAD')?.count || 0) + 
                                   (counts.find(c => c.state === 'SERIAL_WAIT')?.count || 0);
    statisticsData.pauseCount = (counts.find(c => c.state === 'PAUSE')?.count || 0) + 
                                 (counts.find(c => c.state === 'READY_PAUSE')?.count || 0);
    statisticsData.total = res.totalCount || 0;
  } catch {
    console.error('获取状态统计失败');
  }
}

const [Grid, gridApi] = useVbenVxeGrid<WorkflowInstanceItem>({
  formOptions,
  gridOptions,
});

const [LogModalVben, logModalApi] = useVbenModal({
  connectedComponent: LogModal,
});

function handleViewLog(row: WorkflowInstanceItem) {
  logModalApi.setData({ 
    workflowInstanceId: row.id, 
    taskName: row.name 
  }).open();
}

function handleDownloadLog(row: WorkflowInstanceItem) {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  
  const form = document.createElement('form');
  form.action = `/api/log/projects/${projectCode}/workflow-instances/${row.id}/download-log`;
  form.method = 'get';
  form.style.display = 'none';
  
  const button = document.createElement('input');
  button.type = 'submit';
  form.appendChild(button);
  
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}

async function handleReRun(row: WorkflowInstanceItem) {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  
  const allowedStates = ['SUCCESS', 'PAUSE', 'FAILURE', 'STOP'];
  if (!allowedStates.includes(row.state)) {
    message.warning('当前状态不允许重跑操作');
    return;
  }
  
  try {
    await execute(projectCode, {
      executeType: 'REPEAT_RUNNING',
      workflowInstanceId: row.id,
    });
    message.success('重跑操作成功');
    gridApi.reload();
    loadStateStatistics();
  } catch (error: any) {
    const errorMsg = error?.response?.data?.msg || error?.message || '重跑操作失败';
    message.error(errorMsg);
  }
}

async function handleStop(row: WorkflowInstanceItem) {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  
  if (row.state !== 'RUNNING_EXECUTION') {
    message.warning('当前状态不允许停止操作');
    return;
  }
  
  try {
    await execute(projectCode, {
      executeType: 'STOP',
      workflowInstanceId: row.id,
    });
    message.success('停止操作成功');
    gridApi.reload();
    loadStateStatistics();
  } catch (error: any) {
    const errorMsg = error?.response?.data?.msg || error?.message || '停止操作失败';
    message.error(errorMsg);
  }
}

async function handleDelete(row: WorkflowInstanceItem) {
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  
  const allowedStates = ['SUCCESS', 'FAILURE', 'STOP', 'PAUSE'];
  if (!allowedStates.includes(row.state)) {
    message.warning('当前状态不允许删除操作');
    return;
  }
  
  try {
    await deleteWorkflowInstance(projectCode, row.id);
    message.success('删除成功');
    gridApi.reload();
    loadStateStatistics();
  } catch (error: any) {
    const errorMsg = error?.response?.data?.msg || error?.message || '删除失败';
    message.error(errorMsg);
  }
}

function handleDeveloping() {
  Modal.info({
    title: '提示',
    content: '该功能正在开发中，敬请期待...',
  });
}

onMounted(() => {
  projectStore.fetchProjectList();
  loadStateStatistics();
  gridApi.reload();
});

onActivated(() => {
  gridApi.reload();
  loadStateStatistics();
});

watch(
  () => projectStore.currentProjectCode,
  (newCode, oldCode) => {
    if (newCode && (!oldCode || newCode !== oldCode)) {
      gridApi.reload();
      loadStateStatistics();
    }
  },
);
</script>

<template>
  <Page
    auto-content-height

  >
    <div class="flex flex-col gap-4">
      <div class="statistics-container">
        <div
          v-for="item in statCards"
          :key="item.key"
          class="statistics-li"
        >
          <p class="statistics-title">
            <span class="title-icon" :style="{ background: item.iconBg }">
              <component
                :is="item.icon"
                :class="{ 'animate-spin': item.key === 'running' }"
              />
            </span>
            {{ item.label }}
          </p>
          <div class="info">
            <strong>{{ item.value }}</strong>
          </div>
          <img :src="item.wave" class="wave" alt="" />
        </div>
      </div>



      <Card >
        <Grid table-title="任务实例列表" table-title-help="支持列宽拖动">
          <template #state="{ row }">
            <Tag :color="getStateTag(row.state).color">
              {{ getStateTag(row.state).text }}
            </Tag>
          </template>
          <template #commandType="{ row }">
            <span>{{ getCommandTypeText(row.commandType) }}</span>
          </template>
          <template #action="{ row }">
            <Space size="small" wrap class="action-buttons">
              <Tooltip title="重跑">
                <Button 
                  size="large" 
                  type="link" 
                  :disabled="!['SUCCESS', 'PAUSE', 'FAILURE', 'STOP'].includes(row.state)"
                  @click="handleReRun(row)"
                >
                  <template #icon>
                    <ReloadOutlined />
                  </template>
                </Button>
              </Tooltip>
              <Tooltip title="停止">
                <Button 
                  size="large" 
                  type="link" 
                  :disabled="row.state !== 'RUNNING_EXECUTION'"
                  @click="handleStop(row)"
                >
                  <template #icon>
                    <StopOutlined />
                  </template>
                </Button>
              </Tooltip>
              <Popconfirm
                title="确定要删除该任务实例吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDelete(row)"
              >
                <Tooltip title="删除">
                  <Button 
                    size="large" 
                    type="link" 
                    danger
                    :disabled="!['SUCCESS', 'FAILURE', 'STOP', 'PAUSE'].includes(row.state)"
                  >
                    <template #icon>
                      <DeleteOutlined />
                    </template>
                  </Button>
                </Tooltip>
              </Popconfirm>
              <Tooltip title="查看日志">
                <Button size="large" type="link" @click="handleViewLog(row)">
                  <template #icon>
                    <FileTextOutlined />
                  </template>
                </Button>
              </Tooltip>
              <Tooltip title="下载日志">
                <Button size="large" type="link" @click="handleDownloadLog(row)">
                  <template #icon>
                    <DownloadOutlined />
                  </template>
                </Button>
              </Tooltip>
            </Space>
          </template>
        </Grid>
      </Card>
    </div>

    <LogModalVben />
  </Page>
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.statistics-container {
  display: flex;
  flex-wrap: wrap;

  justify-content: space-between;
}

.statistics-li {
  position: relative;
  flex: 0 0 calc(16.666% - 8px);
  min-width: 150px;
  height: 130px;
  padding: 20px;
  background: rgb(255, 255, 255);
  box-shadow: rgba(0, 0, 0, 0.1) 0px 1px 2px -1px, rgba(0, 0, 0, 0.1) 0px 1px 3px 0px;
  border-radius: 14px;
  border: 1px solid rgb(243, 244, 246);
  transition: all 0.3s ease;
}

.statistics-li:hover {
  box-shadow: rgba(0, 0, 0, 0.15) 0px 4px 12px -2px, rgba(0, 0, 0, 0.15) 0px 4px 16px 0px;
  transform: translateY(-2px);
}

.statistics-title {
  display: flex;
  align-items: center;
  line-height: 34px;
  font-weight: 400;
  font-size: 14px;
  color: rgb(74, 85, 101);
  margin: 0;
}

.title-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  object-fit: contain;
  margin-right: 10px;
  padding: 7px 8px;
  box-shadow: rgba(0, 0, 0, 0.1) 0px 1px 2px -1px, rgba(0, 0, 0, 0.1) 0px 2px 3px -1px;
  border-radius: 10px;
  color: white;
  font-size: 18px;
}

.info {
  position: absolute;
  right: 20px;
  top: 45px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.info strong {
  font-weight: 700;
  font-size: 30px;
  color: rgb(16, 24, 40);
}

.wave {
  position: absolute;
  width: 100%;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 0 0 14px 14px;
}

.progress-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 10px 20px 24px 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.ant-card-body) {
  padding: 8px !important;
}

.progress-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.progress-text {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.progress-num {
  font-size: 28px;
  font-weight: 700;
  color: #1890ff;
}

.progress-slash {
  font-size: 20px;
  color: rgba(0, 0, 0, 0.35);
  font-weight: 500;
}

.progress-total {
  font-size: 20px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.65);
}

.progress-unit {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.55);
  margin-left: 8px;
}

.progress-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-track {
  flex: 1;
  height: 12px;
  background: #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 6px;
  transition: width 0.5s ease;
}

.progress-fill-success {
  background: linear-gradient(90deg, #52c41a 0%, #73d13d 100%);
}

.progress-fill-exception {
  background: linear-gradient(90deg, #ff4d4f 0%, #ff7875 100%);
}

.progress-percent {
  min-width: 50px;
  text-align: right;
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

:deep(.vxe-table) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.vxe-table--header-wrapper) {
  border-radius: 8px 8px 0 0;
}

:deep(.vxe-table--body-wrapper) {
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
