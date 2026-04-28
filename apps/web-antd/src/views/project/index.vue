<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import type { ProjectItem } from '#/api/project';

import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenModal, useVbenDrawer } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import { Button, Card, message, Popconfirm, Space, Tooltip } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import {
  createProject,
  deleteProject,
  getProjectList,
  updateProject,
} from '#/api/project';
import { useVbenVxeGrid } from '#/adapter/vxe-table';

import CreateProjectModal from './components/create-project-modal.vue';
import ProjectParameterDrawer from './components/project-parameter-drawer.vue';
import AssignWorkerGroupDrawer from './components/assign-worker-group-drawer.vue';
import ProjectPreferenceDrawer from './components/project-preference-drawer.vue';

defineOptions({ name: 'ProjectList' });

const userStore = useUserStore();
const userInfo = computed(() => userStore.userInfo);
const router = useRouter();

const searchForm = reactive({
  searchVal: '',
});

const formOptions: VbenFormProps = {
  collapsed: false,
  actionLayout: 'rowEnd',
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入项目名称',
        allowClear: true,
      },
      fieldName: 'searchVal',
      label: '项目名称',
    },
  ],
  showCollapseButton: false,
  submitButtonOptions: {
    content: '查询',
  },
  handleSubmit: async (values) => {
    searchForm.searchVal = values.searchVal || '';
    gridApi.reload();
  },
  handleReset: async () => {
    searchForm.searchVal = '';
    gridApi.formApi.resetForm();
    gridApi.reload();
  },
};

const gridOptions: VxeTableGridOptions<ProjectItem> = {
  stripe: true,
  columns: [
    { title: '#', type: 'seq', width: 60 },
    {
      field: 'name',
      title: '项目名称',
      minWidth: 150,
    },
    {
      field: 'userName',
      title: '所属用户',
      width: 120,
    },
    {
      field: 'defCount',
      title: '工作流定义数量',
      width: 140,
    },
    {
      field: 'description',
      title: '描述',
      minWidth: 150,
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
        try {
          const res = await getProjectList({
            pageSize: page.pageSize,
            pageNo: page.currentPage,
            searchVal: searchForm.searchVal || undefined,
          });
          return {
            items: res.totalList || [],
            total: res.total || 0,
          };
        } catch {
          message.error('获取项目列表失败');
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

const [Grid, gridApi] = useVbenVxeGrid<ProjectItem>({
  formOptions,
  gridOptions,
});

const [CreateModal, createModalApi] = useVbenModal({
  connectedComponent: CreateProjectModal,
});

const [ParameterDrawer, parameterDrawerApi] = useVbenDrawer({
  connectedComponent: ProjectParameterDrawer,
});

const [AssignWorkerGroup, assignWorkerGroupApi] = useVbenDrawer({
  connectedComponent: AssignWorkerGroupDrawer,
});

const [PreferenceDrawer, preferenceDrawerApi] = useVbenDrawer({
  connectedComponent: ProjectPreferenceDrawer,
});

function handleAdd() {
  createModalApi.setData({
    editMode: false,
  }).open();
}

function handleEdit(row: ProjectItem) {
  createModalApi.setData({
    editMode: true,
    project: row,
    userName: row.userName,
  }).open();
}

function handleOverview(record: ProjectItem) {
  router.push({
    path: '/project/overview',
    query: { projectCode: record.code },
  });
}

function handleAssignWorkerGroup(record: ProjectItem) {
  assignWorkerGroupApi.setData({
    projectCode: record.code,
    projectName: record.name,
  }).open();
}

function handleParameter(record: ProjectItem) {
  parameterDrawerApi.setData({
    projectCode: record.code,
    projectName: record.name,
  }).open();
}

function handlePreference(record: ProjectItem) {
  preferenceDrawerApi.setData({
    projectCode: record.code,
    projectName: record.name,
  }).open();
}

async function handleDelete(row: ProjectItem) {
  try {
    await deleteProject(row.code);
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
    title="项目管理"
    description="管理所有项目，包括创建、编辑、删除、项目概览、分配工作组、项目级别参数、项目偏好设置等操作"
  >
    <Card class="task-card">
      <Grid table-title="项目列表" table-title-help="支持列宽拖动">
        <template #toolbar-tools>
          <Button type="primary" @click="handleAdd">新建项目</Button>
        </template>
        <template #action="{ row }">
          <Space size="small" wrap class="action-buttons">
            <Tooltip title="项目概览">
              <Button size="large" type="link" @click="handleOverview(row)">
                <template #icon><IconifyIcon icon="ant-design:eye-outlined" /></template>
              </Button>
            </Tooltip>
            <Tooltip title="编辑">
              <Button size="large" type="link" @click="handleEdit(row)">
                <template #icon><IconifyIcon icon="ant-design:edit-outlined" /></template>
              </Button>
            </Tooltip>
            <Tooltip title="分配工作组">
              <Button size="large" type="link" @click="handleAssignWorkerGroup(row)">
                <template #icon><IconifyIcon icon="ant-design:cluster-outlined" /></template>
              </Button>
            </Tooltip>
            <Tooltip title="项目级别参数">
              <Button size="large" type="link" @click="handleParameter(row)">
                <template #icon><IconifyIcon icon="ant-design:tool-outlined" /></template>
              </Button>
            </Tooltip>
            <Tooltip title="项目偏好设置">
              <Button size="large" type="link" @click="handlePreference(row)">
                <template #icon><IconifyIcon icon="ant-design:setting-outlined" /></template>
              </Button>
            </Tooltip>
            <Popconfirm
              title="确定要删除此项目吗？"
              ok-text="确定"
              cancel-text="取消"
              @confirm="handleDelete(row)"
            >
              <Tooltip title="删除">
                <Button size="large" type="link" danger>
                  <template #icon><IconifyIcon icon="ant-design:delete-outlined" /></template>
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        </template>
      </Grid>
    </Card>
    <CreateModal @success="gridApi.reload()" />
    <ParameterDrawer />
    <AssignWorkerGroup @success="gridApi.reload()" />
    <PreferenceDrawer @success="gridApi.reload()" />
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
