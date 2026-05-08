<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import type { FlinkJobConfigItem } from '#/api/flink-job-config';

import { reactive } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, Card, message, Popconfirm, Space, Tooltip } from 'ant-design-vue';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons-vue';

import { deleteFlinkJobConfig, getFlinkJobConfigList } from '#/api/flink-job-config';
import { useVbenVxeGrid } from '#/adapter/vxe-table';

import CreateFlinkConfigModal from './components/create-flink-config-modal.vue';

defineOptions({ name: 'FlinkJobConfigList' });

const searchForm = reactive({
  resourceName: '',
});

const formOptions: VbenFormProps = {
  collapsed: false,
  actionLayout: 'rowEnd',
  schema: [
    {
      component: 'Input',
      componentProps: {
        placeholder: '请输入资源名称',
        allowClear: true,
      },
      fieldName: 'resourceName',
      label: '资源名称',
    },
  ],
  showCollapseButton: false,
  submitButtonOptions: {
    content: '查询',
  },
  handleSubmit: async (values) => {
    searchForm.resourceName = values.resourceName || '';
    gridApi.reload();
  },
  handleReset: async () => {
    searchForm.resourceName = '';
    gridApi.formApi.resetForm();
    gridApi.reload();
  },
};

const gridOptions: VxeTableGridOptions<FlinkJobConfigItem> = {
  stripe: true,
  columns: [
    { title: '#', type: 'seq', width: 60 },
    {
      field: 'resourceName',
      title: '资源名称',
      minWidth: 120,
    },
    {
      field: 'flinkVersion',
      title: 'Flink版本',
      width: 100,
    },
    {
      field: 'jmMemory',
      title: 'JM内存(MB)',
      width: 110,
    },
    {
      field: 'tmMemory',
      title: 'TM内存(MB)',
      width: 110,
    },
    {
      field: 'submitMode',
      title: '提交模式',
      width: 120,
    },
    {
      field: 'parallelism',
      title: '并行度',
      width: 80,
    },
    {
      field: 'slots',
      title: 'Slots',
      width: 70,
    },
    {
      field: 'queueName',
      title: 'YARN队列',
      width: 100,
    },
    {
      field: 'checkpointIntervalMs',
      title: 'Checkpoint间隔(ms)',
      width: 150,
    },
    {
      field: 'checkpointTimeoutMs',
      title: 'Checkpoint超时(ms)',
      width: 150,
    },
    {
      field: 'checkpointDir',
      title: 'Checkpoint目录',
      minWidth: 180,
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
      width: 120,
      fixed: 'right',
      slots: { default: 'action' },
    },
  ],
  pagerConfig: {
    enabled: true,
    currentPage: 1,
    pageSize: 10,
    pageSizes: [10, 20, 50, 100],
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }) => {
        try {
          const res = await getFlinkJobConfigList({
            pageSize: page.pageSize,
            pageNo: page.currentPage,
            resourceName: searchForm.resourceName || undefined,
          });
          if (Array.isArray(res)) {
            return {
              items: res,
              total: res.length,
            };
          }
          return {
            items: res.totalList || [],
            total: res.total || 0,
          };
        } catch {
          message.error('获取资源配置列表失败');
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

const [Grid, gridApi] = useVbenVxeGrid<FlinkJobConfigItem>({
  formOptions,
  gridOptions,
});

const [CreateModal, createModalApi] = useVbenModal({
  connectedComponent: CreateFlinkConfigModal,
});

function handleAdd() {
  createModalApi.setData({
    editMode: false,
  }).open();
}

function handleEdit(row: FlinkJobConfigItem) {
  createModalApi.setData({
    editMode: true,
    config: row,
  }).open();
}

async function handleDelete(row: FlinkJobConfigItem) {
  try {
    await deleteFlinkJobConfig(row.id);
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
    title="资源配置"
    description="管理Flink作业资源配置，包括创建、编辑、删除等操作"
  >
    <Card class="task-card">
      <Grid table-title="资源配置列表" table-title-help="支持列宽拖动">
        <template #toolbar-tools>
          <Button type="primary" @click="handleAdd">新建配置</Button>
        </template>
        <template #action="{ row }">
          <Space size="small" wrap class="action-buttons">
            <Tooltip title="编辑">
              <Button size="large" type="link" @click="handleEdit(row)">
                <template #icon><EditOutlined /></template>
              </Button>
            </Tooltip>
            <Popconfirm
              title="确定要删除此资源配置吗？"
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
    <CreateModal @success="gridApi.reload()" />
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
