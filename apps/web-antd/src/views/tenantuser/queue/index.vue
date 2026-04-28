<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { OnActionClickParams, VxeTableGridOptions } from '#/adapter/vxe-table';
import type { VxeGridPropTypes } from 'vxe-table';

import { computed, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { $t } from '@vben/locales';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useVbenForm } from '#/adapter/form';

interface QueueInfo {
  id: number;
  queueName: string;
  queue: string;
  createTime: string;
  updateTime: string;
}

const editId = ref<number>();

function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'searchVal',
      label: $t('tenantuser.queue.queueName'),
    },
  ];
}

function useColumns(
  onActionClick: (e: OnActionClickParams<QueueInfo>) => void,
): VxeGridPropTypes.Columns {
  return [
    { type: 'seq', title: '#', width: 60 },
    { field: 'queueName', title: $t('tenantuser.queue.queueName'), minWidth: 150 },
    { field: 'queue', title: $t('tenantuser.queue.queueValue'), minWidth: 150 },
    { field: 'createTime', title: $t('tenantuser.queue.createTime'), width: 180 },
    { field: 'updateTime', title: $t('tenantuser.queue.updateTime'), width: 180 },
    {
      align: 'center',
      cellRender: {
        attrs: {
          nameField: 'queueName',
          nameTitle: $t('tenantuser.queue.queueName'),
          onClick: onActionClick,
        },
        name: 'CellOperation',
        options: ['edit', 'delete'],
      },
      field: 'operation',
      fixed: 'right',
      title: $t('tenantuser.queue.operation'),
      width: 130,
    },
  ];
}

function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'id',
      label: 'ID',
      dependencies: {
        show: () => false,
        triggerFields: ['id'],
      },
    },
    {
      component: 'Input',
      fieldName: 'queueName',
      label: $t('tenantuser.queue.queueName'),
      rules: 'required',
      componentProps: {
        placeholder: $t('tenantuser.queue.queueNamePlaceholder'),
        maxlength: 100,
      },
    },
    {
      component: 'Input',
      fieldName: 'queue',
      label: $t('tenantuser.queue.queueValue'),
      rules: 'required',
      componentProps: {
        placeholder: $t('tenantuser.queue.queueValuePlaceholder'),
        maxlength: 100,
      },
    },
  ];
}

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(),
  showDefaultActions: false,
});

const getTitle = computed(() => {
  return editId.value ? $t('tenantuser.queue.editQueue') : $t('tenantuser.queue.createQueue');
});

const [FormModal, formModalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = (await formApi.getValues()) as QueueInfo;
    formModalApi.lock();
    try {
      if (values.id) {
        // TODO: 调用更新API
        // await updateQueueApi(values);
        message.success($t('tenantuser.queue.updateSuccess'));
        onRefresh();
      } else {
        // TODO: 调用创建API
        // await createQueueApi(values);
        message.success($t('tenantuser.queue.createSuccess'));
        onRefresh();
      }
      formModalApi.close();
    } catch {
      formModalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = formModalApi.getData<QueueInfo>();
      formApi.resetForm();
      if (data) {
        editId.value = data.id;
        formApi.setValues(data);
      } else {
        editId.value = undefined;
      }
    }
  },
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(onActionClick),
    height: 'auto',
    keepSource: true,
    pagerConfig: {
      enabled: true,
      pageSize: 10,
      pageSizes: [10, 30, 50],
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          // TODO: 替换为实际的API调用
          // const result = await getQueueListApi(
          //   page.pageSize,
          //   page.currentPage,
          //   formValues?.searchVal || '',
          // );
          // return {
          //   items: result.totalList,
          //   total: result.total,
          // };
          
          // 模拟数据
          const mockData: QueueInfo[] = [
            {
              id: 1,
              queueName: 'default',
              queue: 'default',
              createTime: '2024-01-15 10:30:00',
              updateTime: '2024-01-20 14:20:00',
            },
            {
              id: 2,
              queueName: 'high_priority',
              queue: 'root.high_priority',
              createTime: '2024-01-10 09:00:00',
              updateTime: '2024-01-18 16:45:00',
            },
            {
              id: 3,
              queueName: 'low_priority',
              queue: 'root.low_priority',
              createTime: '2024-01-05 11:20:00',
              updateTime: '2024-01-19 09:30:00',
            },
          ];
          
          return {
            items: mockData,
            total: mockData.length,
          };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: {
      custom: false,
      export: false,
      refresh: true,
      search: false,
      zoom: true,
    },
  } as VxeTableGridOptions<QueueInfo>,
});

function onActionClick(e: OnActionClickParams<QueueInfo>) {
  switch (e.code) {
    case 'delete': {
      onDelete(e.row);
      break;
    }
    case 'edit': {
      onEdit(e.row);
      break;
    }
  }
}

function confirm(content: string, title: string) {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      content,
      onCancel() {
        reject(new Error($t('tenantuser.queue.cancel')));
      },
      onOk() {
        resolve(true);
      },
      title,
    });
  });
}

function onEdit(row: QueueInfo) {
  formModalApi.setData(row).open();
}

async function onDelete(row: QueueInfo) {
  try {
    await confirm($t('tenantuser.queue.deleteConfirm', { name: row.queueName }), $t('tenantuser.queue.deleteTitle'));
    // TODO: 调用删除API
    // await deleteQueueApi(row.id);
    message.success($t('tenantuser.queue.deleteSuccess'));
    onRefresh();
  } catch {
  }
}

function onRefresh() {
  gridApi.query();
}

function onCreate() {
  formModalApi.setData(null).open();
}
</script>
<template>
  <Page auto-content-height>
    <FormModal :title="getTitle">
      <Form class="mx-4" />
    </FormModal>
    
    <Grid :table-title="$t('tenantuser.queue.queueList')">
      <template #form-submit-before>
        <Button type="primary" @click="onCreate">
          <Plus class="mr-1 size-4" />
          {{ $t('tenantuser.queue.createQueue') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
