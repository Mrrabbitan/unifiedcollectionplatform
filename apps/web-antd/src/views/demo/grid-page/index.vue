<script lang="ts" setup>
import type { VbenFormProps } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { Page } from '@vben/common-ui';

import { Button, message } from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenVxeGrid } from '#/adapter/vxe-table';

interface RowType {
  age: number;
  createTime: string;
  email: string;
  id: number;
  phone: string;
  status: string;
  username: string;
}

const mockData: RowType[] = (() => {
  const data: RowType[] = [];
  const statuses = ['active', 'inactive', 'pending'];
  for (let i = 1; i <= 100; i++) {
    data.push({
      age: 20 + Math.floor(Math.random() * 40),
      createTime: dayjs()
        .subtract(Math.floor(Math.random() * 365), 'days')
        .format('YYYY-MM-DD HH:mm:ss'),
      email: `user${i}@example.com`,
      id: i,
      phone: `138${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      status: statuses[Math.floor(Math.random() * statuses.length)] as string,
      username: `用户${i}`,
    });
  }
  return data;
})();

const formOptions: VbenFormProps = {
  collapsed: false,
  schema: [
    {
      component: 'Input',
      fieldName: 'username',
      label: '用户名',
      componentProps: {
        placeholder: '请输入用户名',
      },
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: '邮箱',
      componentProps: {
        placeholder: '请输入邮箱',
      },
    },
    {
      component: 'Select',
      componentProps: {
        allowClear: true,
        options: [
          { label: '激活', value: 'active' },
          { label: '未激活', value: 'inactive' },
          { label: '待审核', value: 'pending' },
        ],
        placeholder: '请选择状态',
      },
      fieldName: 'status',
      label: '状态',
    },
    {
      component: 'RangePicker',
      fieldName: 'dateRange',
      label: '创建时间',
    },
  ],
  showCollapseButton: true,
  submitOnChange: false,
  submitOnEnter: true,
};

const gridOptions: VxeTableGridOptions<RowType> = {
  checkboxConfig: {
    highlight: true,
    labelField: 'username',
  },
  columns: [
    { title: '序号', type: 'seq', width: 60 },
    { align: 'left', title: '选择', type: 'checkbox', width: 60 },
    { field: 'username', title: '用户名', minWidth: 120 },
    { field: 'email', title: '邮箱', minWidth: 180 },
    { field: 'phone', title: '手机号', minWidth: 140 },
    { field: 'age', title: '年龄', width: 80 },
    {
      field: 'status',
      title: '状态',
      width: 100,
      formatter: ({ cellValue }) => {
        const statusMap: Record<string, string> = {
          active: '激活',
          inactive: '未激活',
          pending: '待审核',
        };
        return statusMap[cellValue] || cellValue;
      },
    },
    { field: 'createTime', title: '创建时间', minWidth: 160 },
  ],
  height: 'auto',
  pagerConfig: {
    enabled: true,
    currentPage: 1,
    pageSize: 10,
    pageSizes: [10, 20, 50, 100],
    total: mockData.length,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page }, formValues) => {
        let filteredData = [...mockData];

        if (formValues.username) {
          filteredData = filteredData.filter((item) =>
            item.username.includes(formValues.username),
          );
        }
        if (formValues.email) {
          filteredData = filteredData.filter((item) =>
            item.email.includes(formValues.email),
          );
        }
        if (formValues.status) {
          filteredData = filteredData.filter(
            (item) => item.status === formValues.status,
          );
        }
        if (formValues.dateRange && formValues.dateRange.length === 2) {
          const [start, end] = formValues.dateRange;
          filteredData = filteredData.filter((item) => {
            const itemDate = dayjs(item.createTime);
            return itemDate.isAfter(dayjs(start)) && itemDate.isBefore(dayjs(end));
          });
        }

        const startIndex = (page.currentPage - 1) * page.pageSize;
        const endIndex = startIndex + page.pageSize;
        const pageData = filteredData.slice(startIndex, endIndex);

        return {
          items: pageData,
          total: filteredData.length,
        };
      },
    },
  },
  toolbarConfig: {
    custom: true,
    refresh: true,
    resizable: true,
    zoom: true,
  },
};

const [Grid, gridApi] = useVbenVxeGrid<RowType>({
  formOptions,
  gridOptions,
});

function handleAdd() {
  message.success('点击了新增按钮');
}

function handleExport() {
  message.success('点击了导出按钮');
}

function handleRefresh() {
  gridApi.reload();
}
</script>

<template>
  <Page
    auto-content-height
    description="这是一个使用 useVbenVxeGrid 创建的示例页面，包含查询表单和分页表格功能。"
    title="用户管理"
  >
    <Grid table-title="用户列表" table-title-help="支持多条件查询和分页">
      <template #toolbar-tools>
        <Button class="mr-2" type="primary" @click="handleAdd">
          新增用户
        </Button>
        <Button class="mr-2" @click="handleExport">
          导出数据
        </Button>
        <Button @click="handleRefresh">
          刷新
        </Button>
      </template>
    </Grid>
  </Page>
</template>
