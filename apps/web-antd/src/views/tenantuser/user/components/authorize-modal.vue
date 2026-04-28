<script lang="ts" setup>
import type { UserInfo } from '#/types/tenant/tenant';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Button, message, Table, Tabs, Transfer, Input, Pagination } from 'ant-design-vue';
import type { TableColumnType, TransferProps } from 'ant-design-vue';

import {
  getProjectWithAuthListApi,
  grantProjectApi,
  revokeProjectByIdApi,
  getAuthedDataSourceApi,
  getUnauthDataSourceApi,
  grantDataSourceApi,
  type ProjectWithAuth,
  type DataSourceAuthItem,
} from '#/api/core/user';

defineOptions({ name: 'AuthorizeModal' });

const emit = defineEmits<{
  success: [];
}>();

const [Modal, modalApi] = useVbenModal({
  onConfirm: handleSubmit,
  onOpenChange: handleOpenChange,
});

const currentUser = ref<UserInfo | null>(null);
const activeTab = ref('project');
const loading = ref(false);

const projectLoading = ref(false);
const projectList = ref<ProjectWithAuth[]>([]);
const projectTotal = ref(0);
const projectPageNo = ref(1);
const projectPageSize = ref(10);
const projectSearchVal = ref('');
const selectedProjectIds = ref<number[]>([]);

const dsLoading = ref(false);
const unauthDataSourceList = ref<DataSourceAuthItem[]>([]);
const authedDataSourceList = ref<DataSourceAuthItem[]>([]);
const dsTargetKeys = ref<number[]>([]);

const title = computed(() => {
  if (currentUser.value) {
    return $t('tenantuser.user.authorizeTitle', { name: currentUser.value.userName });
  }
  return $t('tenantuser.user.authorize');
});

function handleOpenChange(isOpen: boolean) {
  if (isOpen) {
    const data = modalApi.getData<UserInfo>();
    currentUser.value = data || null;
    activeTab.value = 'project';
    projectPageNo.value = 1;
    projectSearchVal.value = '';
    selectedProjectIds.value = [];
    dsTargetKeys.value = [];
    loadProjectList();
    loadDataSourceList();
  }
}

async function loadProjectList() {
  if (!currentUser.value) return;
  projectLoading.value = true;
  try {
    const res = await getProjectWithAuthListApi(
      currentUser.value.id,
      projectPageNo.value,
      projectPageSize.value,
      projectSearchVal.value || undefined,
    );
    projectList.value = res.totalList || [];
    projectTotal.value = res.total || 0;
  } catch {
    projectList.value = [];
    projectTotal.value = 0;
  } finally {
    projectLoading.value = false;
  }
}

async function loadDataSourceList() {
  if (!currentUser.value) return;
  dsLoading.value = true;
  try {
    const [authed, unauth] = await Promise.all([
      getAuthedDataSourceApi(currentUser.value.id),
      getUnauthDataSourceApi(currentUser.value.id),
    ]);
    authedDataSourceList.value = authed || [];
    unauthDataSourceList.value = unauth || [];
    dsTargetKeys.value = (authed || []).map((item) => item.id);
  } catch {
    authedDataSourceList.value = [];
    unauthDataSourceList.value = [];
    dsTargetKeys.value = [];
  } finally {
    dsLoading.value = false;
  }
}

function handleProjectSearch() {
  projectPageNo.value = 1;
  loadProjectList();
}

function handleProjectPageChange(page: number, pageSize: number) {
  projectPageNo.value = page;
  projectPageSize.value = pageSize;
  loadProjectList();
}

const projectColumns: TableColumnType[] = [
  {
    title: $t('tenantuser.user.projectName'),
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: $t('tenantuser.user.authStatus'),
    dataIndex: 'perm',
    key: 'perm',
    width: 120,
  },
];

function handleProjectSelectionChange(selectedRowKeys: number[]) {
  selectedProjectIds.value = selectedRowKeys;
}

async function handleGrantProject() {
  if (!currentUser.value || selectedProjectIds.value.length === 0) {
    message.warning($t('tenantuser.user.selectProject'));
    return;
  }
  loading.value = true;
  try {
    await grantProjectApi(currentUser.value.id, selectedProjectIds.value.join(','));
    message.success($t('tenantuser.user.grantSuccess'));
    selectedProjectIds.value = [];
    loadProjectList();
  } catch {
    message.error($t('tenantuser.user.grantFailed'));
  } finally {
    loading.value = false;
  }
}

async function handleRevokeProject() {
  if (!currentUser.value || selectedProjectIds.value.length === 0) {
    message.warning($t('tenantuser.user.selectProject'));
    return;
  }
  loading.value = true;
  try {
    await revokeProjectByIdApi(currentUser.value.id, selectedProjectIds.value.join(','));
    message.success($t('tenantuser.user.revokeSuccess'));
    selectedProjectIds.value = [];
    loadProjectList();
  } catch {
    message.error($t('tenantuser.user.revokeFailed'));
  } finally {
    loading.value = false;
  }
}

const dsTransferDataSource = computed(() => {
  return [...unauthDataSourceList.value, ...authedDataSourceList.value].map((item) => ({
    key: item.id,
    title: item.name,
    description: item.type,
  }));
});

function handleDsTransferChange(newTargetKeys: number[]) {
  dsTargetKeys.value = newTargetKeys;
}

const dsTransferFilterOption: TransferProps['filterOption'] = (inputValue, option) => {
  return (option?.title as string)?.toLowerCase().includes(inputValue.toLowerCase());
};

async function handleSubmit() {
  if (!currentUser.value) return;
  loading.value = true;
  try {
    await grantDataSourceApi(currentUser.value.id, dsTargetKeys.value.join(','));
    message.success($t('tenantuser.user.authorizeSuccess'));
    modalApi.close();
    emit('success');
  } catch {
    message.error($t('tenantuser.user.authorizeFailed'));
    modalApi.unlock();
  } finally {
    loading.value = false;
  }
}

defineExpose({
  modalApi,
});
</script>

<template>
  <Modal :title="title" class="w-[800px]">
    <Tabs v-model:activeKey="activeTab">
      <Tabs.TabPane key="project" :tab="$t('tenantuser.user.projectAuth')">
        <div class="mb-4 flex items-center gap-2">
          <Input
            v-model:value="projectSearchVal"
            :placeholder="$t('tenantuser.user.searchProject')"
            allow-clear
            style="width: 200px"
            @pressEnter="handleProjectSearch"
          />
          <Button type="primary" @click="handleProjectSearch">
            {{ $t('tenantuser.user.search') }}
          </Button>
          <Button type="primary" @click="handleGrantProject" :loading="loading">
            {{ $t('tenantuser.user.grantAuth') }}
          </Button>
          <Button danger @click="handleRevokeProject" :loading="loading">
            {{ $t('tenantuser.user.revokeAuth') }}
          </Button>
        </div>
        <Table
          :columns="projectColumns"
          :data-source="projectList"
          :loading="projectLoading"
          :row-selection="{
            selectedRowKeys: selectedProjectIds,
            onChange: handleProjectSelectionChange,
          }"
          row-key="id"
          :pagination="false"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'perm'">
              <span v-if="record.perm > 0" style="color: #52c41a">
                {{ $t('tenantuser.user.authorized') }}
              </span>
              <span v-else style="color: #999">
                {{ $t('tenantuser.user.unauthorized') }}
              </span>
            </template>
          </template>
        </Table>
        <div class="mt-4 flex justify-end">
          <Pagination
            v-model:current="projectPageNo"
            v-model:pageSize="projectPageSize"
            :total="projectTotal"
            :show-size-changer="true"
            :show-quick-jumper="true"
            :show-total="(total: number) => $t('tenantuser.user.totalItems', { count: total })"
            @change="handleProjectPageChange"
          />
        </div>
      </Tabs.TabPane>
      <Tabs.TabPane key="datasource" :tab="$t('tenantuser.user.datasourceAuth')">
        <div class="mb-2 text-gray-500">
          {{ $t('tenantuser.user.datasourceAuthTip') }}
        </div>
        <Transfer
          v-model:target-keys="dsTargetKeys"
          :data-source="dsTransferDataSource"
          :titles="[$t('tenantuser.user.unauthorized'), $t('tenantuser.user.authorized')]"
          :show-search="true"
          :filter-option="dsTransferFilterOption"
          :render="(item) => item.title"
          :list-style="{
            width: '350px',
            height: '400px',
          }"
          :loading="dsLoading"
        />
      </Tabs.TabPane>
    </Tabs>
  </Modal>
</template>
