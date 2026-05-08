<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridColumns, VxeTableGridOptions } from '#/adapter/vxe-table';

import { computed, ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { $t } from '@vben/locales';

import {
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { Button, Card, message, Modal, Popconfirm, Space, Tooltip } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useVbenForm, z } from '#/adapter/form';
import type { UserInfo, TenantInfo, QueueInfo } from '#/types/tenant/tenant'
import { getUserApi, createUserApi, updateUserApi, deleteUserApi, getTenantInfoList, getQueueInfoList } from '#/api';
import AuthorizeModal from './components/authorize-modal.vue';

const authorizeModalRef = ref<InstanceType<typeof AuthorizeModal>>();
const formData = ref<UserInfo>();
const editId = ref<string>();
const tenantOptions = ref<{ label: string; value: number }[]>([]);
const queueOptions = ref<{ label: string; value: string }[]>([]);
const tenantMap = ref<Map<number, string>>(new Map());

async function loadTenantOptions() {
  try {
    const data = await getTenantInfoList();
    tenantOptions.value = data.map((item) => ({
      label: item.tenantCode,
      value: item.id,
    }));
    tenantMap.value = new Map(data.map((item) => [item.id, item.tenantCode]));
  } catch {
    tenantOptions.value = [];
    tenantMap.value = new Map();
  }
}

async function loadQueueOptions() {
  try {
    const data = await getQueueInfoList();
    queueOptions.value = data.map((item) => ({
      label: item.queueName,
      value: item.queue,
    }));
  } catch {
    queueOptions.value = [];
  }
}

function useUserFormSchema(): VbenFormSchema[] {
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
      fieldName: 'userType',
      label: $t('tenantuser.user.userType'),
      dependencies: {
        show: () => false,
        triggerFields: ['userType'],
      },
    },
    {
      component: 'Input',
      fieldName: 'timeZone',
      label: $t('tenantuser.user.timeZone'),
      dependencies: {
        show: () => false,
        triggerFields: ['timeZone'],
      },
    },
    {
      component: 'Input',
      fieldName: 'createTime',
      label: $t('tenantuser.user.createTime'),
      dependencies: {
        show: () => false,
        triggerFields: ['createTime'],
      },
    },
    {
      component: 'Input',
      fieldName: 'updateTime',
      label: $t('tenantuser.user.updateTime'),
      dependencies: {
        show: () => false,
        triggerFields: ['updateTime'],
      },
    },
    {
      component: 'Input',
      fieldName: 'userName',
      label: $t('tenantuser.user.userName'),
      rules: 'required',
      dependencies: {
        disabled: (values) => !!values.id,
        triggerFields: ['id'],
      },
    },
    {
      component: 'RadioGroup',
      fieldName: 'userType',
      label: $t('tenantuser.user.userType'),
      defaultValue: 1,
      componentProps: {
        options: [
          { label: $t('tenantuser.user.normalUser'), value: 1 },
          { label: $t('tenantuser.user.adminUser'), value: 0 },
        ],
      },
    },
    {
      component: 'InputPassword',
      fieldName: 'userPassword',
      label: $t('tenantuser.user.password'),
      dependencies: {
        show: (values) => !values.id,
        required: (values) => !values.id,
        rules: (values) => values.id ? undefined : 'required',
        triggerFields: ['id'],
      },
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: $t('tenantuser.user.email'),
      rules: z.string().email($t('tenantuser.user.enterCorrectEmail')),
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: $t('tenantuser.user.phone'),
    },
    {
      component: 'Select',
      fieldName: 'tenantId',
      label: $t('tenantuser.user.tenant'),
      rules: 'required',
      componentProps: {
        options: tenantOptions,
        placeholder: $t('tenantuser.user.selectTenant'),
      },
    },
    {
      component: 'Select',
      fieldName: 'queue',
      label: $t('tenantuser.user.queue'),
      componentProps: {
        options: queueOptions,
        placeholder: $t('tenantuser.user.selectQueue'),
      },
    },
    {
      component: 'RadioGroup',
      fieldName: 'state',
      label: $t('tenantuser.user.state'),
      defaultValue: 1,
      componentProps: {
        options: [
          { label: $t('tenantuser.user.enabled'), value: 1 },
          { label: $t('tenantuser.user.disabled'), value: 0 },
        ],
      },
    },
    {
      component: 'Input',
      fieldName: 'homePath',
      label: $t('tenantuser.user.homePath'),
    },
  ];
}

function usePasswordFormSchema(): VbenFormSchema[] {
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
      fieldName: 'userType',
      label: $t('tenantuser.user.userType'),
      dependencies: {
        show: () => false,
        triggerFields: ['userType'],
      },
    },
    {
      component: 'Input',
      fieldName: 'timeZone',
      label: $t('tenantuser.user.timeZone'),
      dependencies: {
        show: () => false,
        triggerFields: ['timeZone'],
      },
    },
    {
      component: 'Input',
      fieldName: 'createTime',
      label: $t('tenantuser.user.createTime'),
      dependencies: {
        show: () => false,
        triggerFields: ['createTime'],
      },
    },
    {
      component: 'Input',
      fieldName: 'updateTime',
      label: $t('tenantuser.user.updateTime'),
      dependencies: {
        show: () => false,
        triggerFields: ['updateTime'],
      },
    },
    {
      component: 'Input',
      fieldName: 'userName',
      label: $t('tenantuser.user.userName'),
      componentProps: {
        disabled: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'email',
      label: $t('tenantuser.user.email'),
      dependencies: {
        show: () => false,
        triggerFields: ['email'],
      },
    },
    {
      component: 'Input',
      fieldName: 'phone',
      label: $t('tenantuser.user.phone'),
      dependencies: {
        show: () => false,
        triggerFields: ['phone'],
      },
    },
    {
      component: 'Input',
      fieldName: 'tenantId',
      label: $t('tenantuser.user.tenant'),
      dependencies: {
        show: () => false,
        triggerFields: ['tenantId'],
      },
    },
    {
      component: 'Input',
      fieldName: 'queue',
      label: $t('tenantuser.user.queue'),
      dependencies: {
        show: () => false,
        triggerFields: ['queue'],
      },
    },
    {
      component: 'Input',
      fieldName: 'state',
      label: $t('tenantuser.user.state'),
      dependencies: {
        show: () => false,
        triggerFields: ['state'],
      },
    },
    {
      component: 'Input',
      fieldName: 'homePath',
      label: $t('tenantuser.user.homePath'),
      dependencies: {
        show: () => false,
        triggerFields: ['homePath'],
      },
    },
    {
      component: 'InputPassword',
      fieldName: 'userPassword',
      label: $t('tenantuser.user.newPassword'),
      rules: 'required',
      componentProps: {
        placeholder: $t('tenantuser.user.enterNewPassword'),
      },
    },
    {
      component: 'InputPassword',
      fieldName: 'confirmPassword',
      label: $t('tenantuser.user.confirmPassword'),
      rules: 'required',
      componentProps: {
        placeholder: $t('tenantuser.user.enterPasswordAgain'),
      },
    },
  ];
}

function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'userName',
      label: $t('tenantuser.user.userName'),
    },
  ];
}

function useColumns(): VxeTableGridColumns {
  return [
    { field: 'id', title: 'ID', visible: false },
    { field: 'userName', title: $t('tenantuser.user.userName'), width: 150 },
    { 
      field: 'userType', 
      title: $t('tenantuser.user.userType'), 
      width: 100,
      formatter: ({ cellValue }) => {
        const typeValue = cellValue === 'ADMIN_USER' ? 0 : 1;
        return typeValue === 0 ? $t('tenantuser.user.adminUser') : $t('tenantuser.user.normalUser');
      },
    },
    { field: 'email', title: $t('tenantuser.user.email'), minWidth: 180 },
    { field: 'phone', title: $t('tenantuser.user.phone'), width: 140 },
    { 
      field: 'tenantId', 
      title: $t('tenantuser.user.tenant'), 
      width: 120,
      formatter: ({ cellValue }) => tenantMap.value.get(cellValue) || cellValue,
    },
    { field: 'queue', title: $t('tenantuser.user.queue'), width: 120 },
    { 
      field: 'state', 
      title: $t('tenantuser.user.state'), 
      width: 80,
      formatter: ({ cellValue }) => cellValue === 1 ? $t('tenantuser.user.enabled') : $t('tenantuser.user.disabled'),
    },
    { field: 'createTime', title: $t('tenantuser.user.createTime'), width: 180 },
    { field: 'updateTime', title: $t('tenantuser.user.updateTime'), width: 180 },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: $t('tenantuser.user.operation'),
      width: 200,
    },
  ];
}

const [UserForm, userFormApi] = useVbenForm({
  schema: useUserFormSchema(),
  showDefaultActions: false,
});

const [PasswordForm, passwordFormApi] = useVbenForm({
  schema: usePasswordFormSchema(),
  showDefaultActions: false,
});

const getTitle = computed(() => {
  return editId.value ? $t('tenantuser.user.editUser') : $t('tenantuser.user.createUser');
});

const [UserModal, userModalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await userFormApi.validate();
    if (!valid) return;
    const values = (await userFormApi.getValues()) as UserInfo;
    userModalApi.lock();
    try {
      if (values.id) {
        const ret = await updateUserApi(values);
        if (ret?.id) {
          message.success($t('tenantuser.user.updateSuccess'));
          onRefresh();
        } else {
          message.error($t('tenantuser.user.updateFailed'));
        }
      } else {
        const ret = await createUserApi(values);
        if (ret) {
          message.success($t('tenantuser.user.createSuccess'));
          onRefresh();
        } else {
          message.error($t('tenantuser.user.createFailed'));
        }
      }
      userModalApi.close();
    } catch {
      userModalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = userModalApi.getData<UserInfo>();
      userFormApi.resetForm();
      Promise.all([loadTenantOptions(), loadQueueOptions()]).then(() => {
        if (data) {
          formData.value = data;
          editId.value = String(data.id);
          const userTypeNum = data.userType === 'ADMIN_USER' ? 0 : 1;
          userFormApi.setValues({ ...data, userType: userTypeNum });
        } else {
          editId.value = undefined;
          formData.value = undefined;
        }
      });
    }
  },
});

const [PasswordModal, passwordModalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await passwordFormApi.validate();
    if (!valid) return;
    const values = await passwordFormApi.getValues();

    if (values.userPassword !== values.confirmPassword) {
      message.error($t('tenantuser.user.passwordNotMatch'));
      return;
    }

    if (!validatePassword(values.userPassword)) {
      message.error($t('tenantuser.user.passwordRule'));
      return;
    }

    const userInfo = passwordModalApi.getData<UserInfo>();
    passwordModalApi.lock();
    try {
      const userTypeNum = userInfo.userType === 'ADMIN_USER' ? 0 : 1;
      const ret = await updateUserApi({
        ...userInfo,
        userPassword: values.userPassword,
        userType: userTypeNum,
      });
      if (ret?.id) {
        message.success($t('tenantuser.user.resetPasswordSuccess'));
        passwordModalApi.close();
      } else {
        message.error($t('tenantuser.user.resetPasswordFailed'));
      }
    } catch {
      passwordModalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      passwordFormApi.resetForm();
      const data = passwordModalApi.getData<UserInfo>();
      if (data) {
        passwordFormApi.setValues(data);
      }
    }
  },
});

function validatePassword(password: string): boolean {
  if (password.length < 6 || password.length > 20) {
    return false;
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasLetter && hasNumber;
}

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
          await loadTenantOptions();
          const result = await getUserApi(
            page.pageSize,
            page.currentPage,
            formValues?.userName || '',
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
  } as VxeTableGridOptions<UserInfo>,
});

function confirm(content: string, title: string) {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      content,
      onCancel() {
        reject(new Error($t('tenantuser.user.cancelled')));
      },
      onOk() {
        resolve(true);
      },
      title,
    });
  });
}

function onEdit(row: UserInfo) {
  userModalApi.setData(row).open();
}

function onResetPassword(row: UserInfo) {
  passwordModalApi.setData(row).open();
}

function onAuthorize(row: UserInfo) {
  authorizeModalRef.value?.modalApi.setData(row).open();
}

async function onDelete(row: UserInfo) {
  try {
    await confirm($t('tenantuser.user.confirmDeleteUser', 
                      { name: row.userName }), 
                      $t('tenantuser.user.deleteConfirm'));
    await deleteUserApi(row.id);
    message.success($t('tenantuser.user.deleteSuccess'));
    onRefresh();
  } catch {
  }
}

function onRefresh() {
  gridApi.query();
}

function onCreate() {
  userModalApi.setData(null).open();
}
</script>
<template>
  <Page
    auto-content-height
    :title="$t('tenantuser.user.pageTitle')"
    :description="$t('tenantuser.user.pageDescription')"
  >
    <UserModal :title="getTitle">
      <UserForm class="mx-4" />
    </UserModal>
    <PasswordModal :title="$t('tenantuser.user.resetPassword')">
      <PasswordForm class="mx-4" />
    </PasswordModal>
    <AuthorizeModal ref="authorizeModalRef" />
    <Card class="task-card">
      <Grid :table-title="$t('tenantuser.user.title')" :table-title-help="$t('tenantuser.user.tableTitleHelp')">
        <template #toolbar-tools>
          <Button type="primary" @click="onCreate">
            <Plus class="mr-1 size-4" />
            {{ $t('tenantuser.user.createUser') }}
          </Button>
        </template>
        <template #action="{ row }">
          <Space size="small" wrap class="action-buttons">
            <Tooltip :title="$t('tenantuser.user.edit')">
              <Button size="large" type="link" @click="onEdit(row)">
                <template #icon><EditOutlined /></template>
              </Button>
            </Tooltip>
            <Tooltip :title="row.userType === 'ADMIN_USER' ? $t('tenantuser.user.authorizeDisabled') : $t('tenantuser.user.authorize')">
              <Button 
                size="large" 
                type="link" 
                :disabled="row.userType === 'ADMIN_USER'"
                @click="onAuthorize(row)"
              >
                <template #icon><UserOutlined /></template>
              </Button>
            </Tooltip>
            <Tooltip :title="$t('tenantuser.user.resetPassword')">
              <Button size="large" type="link" @click="onResetPassword(row)">
                <template #icon><LockOutlined /></template>
              </Button>
            </Tooltip>
            <Popconfirm
              :title="$t('tenantuser.user.confirmDeleteUser', { name: row.userName })"
              :ok-text="$t('tenantuser.user.confirm')"
              :cancel-text="$t('tenantuser.user.cancel')"
              @confirm="onDelete(row)"
            >
              <Tooltip :title="$t('tenantuser.user.delete')">
                <Button size="large" type="link" danger>
                  <template #icon><DeleteOutlined /></template>
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
