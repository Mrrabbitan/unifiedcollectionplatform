<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns, VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { $t } from '@vben/locales';

import { Button, Card, message, Modal, Popconfirm, Space, Tooltip } from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useVbenForm } from '#/adapter/form';
import type { TenantInfo } from '#/types/tenant/tenant'
import { getTenantInfoApi, 
  getQueueInfoApi, 
  updateTenantInfoApi, 
  createTenantInfoApi, 
  deleteTenantInfoApi } from '#/api';

const formData = ref<TenantInfo>();
const editId = ref<string>();
const queueOptions = ref<{ label: string; value: string }[]>([]);

async function loadQueueOptions() {
  try {
    const data = await getQueueInfoApi();
    queueOptions.value = data.map((item) => ({
      label: item.queueName,
      value: String(item.id),
    }));
  } catch {
    queueOptions.value = [];
  }
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
      fieldName: 'tenantCode',
      label: $t('tenantuser.tenant.tenantCode'),
      rules: 'required',
      dependencies: {
        disabled: (values) => !!values.id,
        triggerFields: ['id'],
      },
    },
    {
      component: 'Input',
      fieldName: 'description',
      label: $t('tenantuser.tenant.description'),
    },
    {
      component: 'Select',
      componentProps: {
        options: queueOptions,
        placeholder: $t('tenantuser.tenant.selectQueue'),
      },
      fieldName: 'queueId',
      label: $t('tenantuser.tenant.queue'),
      rules: 'required',
    },
  ];
}

function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'tenantCode',
      label: $t('tenantuser.tenant.tenantCode'),
    },
  ];
}

function useColumns(): VxeTableGridColumns {
  return [
    { field: 'id', title: 'ID', visible: false },
    { field: 'tenantCode', title: $t('tenantuser.tenant.osTenant'), width: 200 },
    { field: 'description', title: $t('tenantuser.tenant.description'), minWidth: 150 },
    { field: 'queueName', title: $t('tenantuser.tenant.queue'), width: 150 },
    { field: 'createTime', title: $t('tenantuser.tenant.createTime'), width: 180 },
    { field: 'updateTime', title: $t('tenantuser.tenant.updateTime'), width: 180 },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: $t('tenantuser.tenant.operation'),
      width: 130,
    },
  ];
}

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(),
  showDefaultActions: false,
});

const getTitle = computed(() => {
  return editId.value ? $t('tenantuser.tenant.editTenant') : $t('tenantuser.tenant.createTenant');
});

const [FormModal, formModalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = (await formApi.getValues()) as TenantInfo;
    const data = formModalApi.getData<TenantInfo>();
    formModalApi.lock();
    try {
      if (values.id) {
        updateTenantInfoApi(values).then((ret) => {
          if (ret) {
            message.success($t('tenantuser.tenant.updateSuccess'));
            onRefresh();
          } else {
            message.error($t('tenantuser.tenant.updateFailed'));
          }
        })
      } else {
        createTenantInfoApi(values).then((ret) => {
          if (ret) {
            message.success($t('tenantuser.tenant.createSuccess'));
            onRefresh();
          } else {
            message.error($t('tenantuser.tenant.createFailed'));
          }
        })
      }
      formModalApi.close();
      
    } catch {
      formModalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = formModalApi.getData<TenantInfo>();
      formApi.resetForm();
      if (data) {
        formData.value = data;
        editId.value = String(data.id);
        loadQueueOptions().then(() => {
          formApi.setValues(data);
        });
      } else {
        editId.value = undefined;
        formData.value = undefined;
        loadQueueOptions();
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
    columns: useColumns(),
    keepSource: true,
    pagerConfig: {
      enabled: true,
      pageSize: 10,
      pageSizes: [10, 20, 50, 100],
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const result = await getTenantInfoApi(
            page.pageSize,
            page.currentPage,
            formValues?.tenantCode,
          );
          return {
            items: result.totalList,
            total: result.total,
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
  } as VxeTableGridOptions<TenantInfo>,
});

function confirm(content: string, title: string) {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      content,
      onCancel() {
        reject(new Error($t('tenantuser.tenant.cancelled')));
      },
      onOk() {
        resolve(true);
      },
      title,
    });
  });
}

function onEdit(row: TenantInfo) {
  formModalApi.setData(row).open();
}

async function onDelete(row: TenantInfo) {
  try {
    await confirm($t('tenantuser.tenant.confirmDeleteTenant', { name: row.tenantCode }), $t('tenantuser.tenant.deleteConfirm'));
    await deleteTenantInfoApi(row.id);
    message.success($t('tenantuser.tenant.deleteSuccess'));
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
  <Page
    auto-content-height
    :title="$t('tenantuser.tenant.pageTitle')"
    :description="$t('tenantuser.tenant.pageDescription')"
  >
    <FormModal :title="getTitle">
      <Form class="mx-4" />
    </FormModal>
    <Card class="task-card">
      <Grid :table-title="$t('tenantuser.tenant.title')" :table-title-help="$t('tenantuser.tenant.tableTitleHelp')">
        <template #toolbar-tools>
          <Button type="primary" @click="onCreate">
            <Plus class="mr-1 size-4" />
            {{ $t('tenantuser.tenant.createTenant') }}
          </Button>
        </template>
        <template #action="{ row }">
          <Space size="small" wrap class="action-buttons">
            <Tooltip :title="$t('tenantuser.tenant.edit')">
              <Button size="large" type="link" @click="onEdit(row)">
                <template #icon><IconifyIcon icon="ant-design:edit-outlined" /></template>
              </Button>
            </Tooltip>
            <Popconfirm
              :title="$t('tenantuser.tenant.confirmDeleteTenant', { name: row.tenantCode })"
              :ok-text="$t('tenantuser.tenant.confirm')"
              :cancel-text="$t('tenantuser.tenant.cancel')"
              @confirm="onDelete(row)"
            >
              <Tooltip :title="$t('tenantuser.tenant.delete')">
                <Button size="large" type="link" danger>
                  <template #icon><IconifyIcon icon="ant-design:delete-outlined" /></template>
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        </template>
      </Grid>
    </Card>
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
  font-size: 14px;
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
