<script lang="ts" setup>
import { ref, watch, computed } from 'vue';

import { Page } from '@vben/common-ui';

import { Card, DatePicker, Spin, Row, Col, Select } from 'ant-design-vue';
import { use } from 'echarts/core';
import { PieChart, BarChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';
import dayjs, { Dayjs } from 'dayjs';
import { useRoute } from 'vue-router';
import { message } from 'ant-design-vue';

import {
  getAnalysisDefineUserCount,
  getAnalysisTaskStateCount,
  getAnalysisWorkflowStateCount,
  getProjectList,
} from '#/api/project';

use([
  PieChart,
  BarChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer,
]);

defineOptions({ name: 'ProjectOverview' });

const route = useRoute();
const loading = ref(false);

const projectCode = ref<number>(0);
const projectName = ref<string>('');
const projectList = ref<any[]>([]);

const dateRange = ref<[Dayjs, Dayjs]>([
  dayjs().startOf('day'),
  dayjs().endOf('day'),
]);

const defineUserCountData = ref<{ userName: string; count: number }[]>([]);

const taskStateCountData = ref<{
  waitingCount: number;
  runningCount: number;
  successCount: number;
  failureCount: number;
  pauseCount: number;
  stopCount: number;
}>({
  waitingCount: 0,
  runningCount: 0,
  successCount: 0,
  failureCount: 0,
  pauseCount: 0,
  stopCount: 0,
});

const workflowStateCountData = ref<{
  waitingCount: number;
  runningCount: number;
  successCount: number;
  failureCount: number;
  pauseCount: number;
  stopCount: number;
}>({
  waitingCount: 0,
  runningCount: 0,
  successCount: 0,
  failureCount: 0,
  pauseCount: 0,
  stopCount: 0,
});

const defineUserChartData = ref<{ name: string; value: number }[]>([]);

const taskStateChartData = ref([
  { name: '等待中', value: 0 },
  { name: '运行中', value: 0 },
  { name: '成功', value: 0 },
  { name: '失败', value: 0 },
  { name: '暂停', value: 0 },
  { name: '停止', value: 0 },
]);

const workflowStateChartData = ref([
  { name: '等待中', value: 0 },
  { name: '运行中', value: 0 },
  { name: '成功', value: 0 },
  { name: '失败', value: 0 },
  { name: '暂停', value: 0 },
  { name: '停止', value: 0 },
]);

function updateChartData() {
  defineUserChartData.value = defineUserCountData.value.map((item) => ({
    name: item.userName,
    value: item.count,
  }));

  taskStateChartData.value = [
    { name: '等待中', value: taskStateCountData.value.waitingCount },
    { name: '运行中', value: taskStateCountData.value.runningCount },
    { name: '成功', value: taskStateCountData.value.successCount },
    { name: '失败', value: taskStateCountData.value.failureCount },
    { name: '暂停', value: taskStateCountData.value.pauseCount },
    { name: '停止', value: taskStateCountData.value.stopCount },
  ];

  workflowStateChartData.value = [
    { name: '等待中', value: workflowStateCountData.value.waitingCount },
    { name: '运行中', value: workflowStateCountData.value.runningCount },
    { name: '成功', value: workflowStateCountData.value.successCount },
    { name: '失败', value: workflowStateCountData.value.failureCount },
    { name: '暂停', value: workflowStateCountData.value.pauseCount },
    { name: '停止', value: workflowStateCountData.value.stopCount },
  ];
}

const userBarOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
  },
  xAxis: {
    type: 'category',
    data: defineUserChartData.value.map((item) => item.name),
  },
  yAxis: {
    type: 'value',
  },
  series: [
    {
      type: 'bar',
      data: defineUserChartData.value.map((item) => item.value),
      label: {
        show: true,
        position: 'top',
      },
    },
  ],
}));

const taskPieOption = computed(() => {
  const chartData = taskStateChartData.value.map((item) => ({
    name: item.name,
    value: item.value || 0,
  }));
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center',
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['55%', '50%'],
        minAngle: 5,
        minShowLabelAngle: 0,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: true,
        },
        data: chartData,
      },
    ],
  };
});

const workflowPieOption = computed(() => {
  const chartData = workflowStateChartData.value.map((item) => ({
    name: item.name,
    value: item.value || 0,
  }));
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center',
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['55%', '50%'],
        minAngle: 5,
        minShowLabelAngle: 0,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
          },
        },
        labelLine: {
          show: true,
        },
        data: chartData,
      },
    ],
  };
});

async function fetchProjectList() {
  try {
    const res = await getProjectList({
      pageSize: 1000,
      pageNo: 1,
      searchVal: '',
    });
    projectList.value = res.totalList || [];
  } catch {
    message.error('获取项目列表失败');
  }
}

async function fetchData() {
  if (!projectCode.value) return;

  loading.value = true;
  try {
    const [defineUserRes, taskStateRes, workflowStateRes] = await Promise.all([
      getAnalysisDefineUserCount(projectCode.value),
      getAnalysisTaskStateCount(
        dateRange.value[0].format('YYYY-MM-DD HH:mm:ss'),
        dateRange.value[1].format('YYYY-MM-DD HH:mm:ss'),
        projectCode.value,
      ),
      getAnalysisWorkflowStateCount(
        dateRange.value[0].format('YYYY-MM-DD HH:mm:ss'),
        dateRange.value[1].format('YYYY-MM-DD HH:mm:ss'),
        projectCode.value,
      ),
    ]);

    defineUserCountData.value = defineUserRes.userList || [];
    taskStateCountData.value = taskStateRes;
    workflowStateCountData.value = workflowStateRes;
    updateChartData();
  } catch {
    message.error('获取数据失败');
  } finally {
    loading.value = false;
  }
}

function handleProjectChange(value: number) {
  const project = projectList.value.find((p) => p.code === value);
  if (project) {
    projectName.value = project.name;
    projectCode.value = value;
    fetchData();
  }
}

function handleDateChange() {
  fetchData();
}

watch(
  () => route.query,
  async (query) => {
    await fetchProjectList();
    if (query.projectCode) {
      projectCode.value = Number(query.projectCode);
      const project = projectList.value.find((p) => p.code === projectCode.value);
      if (project) {
        projectName.value = project.name;
      }
      await fetchData();
    }
  },
  { immediate: true },
);
</script>

<template>
  <Page title="项目概览" :description="projectName">
    <Card>
      <template #extra>
        <Row :gutter="16" align="middle">
          <Col>
            <Select
              v-model:value="projectCode"
              placeholder="请选择项目"
              style="width: 200px"
              @change="handleProjectChange"
            >
              <Select.Option v-for="proj in projectList" :key="proj.code" :value="proj.code">
                {{ proj.name }}
              </Select.Option>
            </Select>
          </Col>
          <Col>
            <DatePicker.RangePicker
              v-model:value="dateRange"
              show-time
              format="YYYY-MM-DD HH:mm:ss"
              @change="handleDateChange"
            />
          </Col>
        </Row>
      </template>

      <Spin :spinning="loading">
        <Row :gutter="[16, 16]">
          <Col :span="24">
            <Card title="定义用户分布" size="small">
              <VChart :option="userBarOption" style="height: 300px" autoresize />
            </Card>
          </Col>

          <Col :span="12">
            <Card title="任务状态分布" size="small">
              <VChart :option="taskPieOption" style="height: 300px" autoresize />
            </Card>
          </Col>

          <Col :span="12">
            <Card title="工作流状态统计" size="small">
              <VChart :option="workflowPieOption" style="height: 300px" autoresize />
            </Card>
          </Col>
        </Row>
      </Spin>
    </Card>
  </Page>
</template>
