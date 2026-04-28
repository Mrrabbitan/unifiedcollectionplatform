<script lang="ts" setup>
import type { ProjectParameterItem } from '#/api/project';

import { reactive, ref } from 'vue';

import { useVbenDrawer, VbenButton } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tooltip,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';

import {
  createProjectParameter,
  deleteProjectParameter,
  getProjectParameterList,
  updateProjectParameter,
} from '#/api/project';

defineOptions({ name: 'ProjectParameterDrawer' });

const [Drawer, drawerApi] = useVbenDrawer({
  onOpenChange: handleOpenChange,
});

const projectCode = ref<number>(0);
const projectName = ref('');
const loading = ref(false);
const tableData = ref<ProjectParameterItem[]>([]);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '30', '50'],
});
const searchVal = ref('');

const modalVisible = ref(false);
const modalLoading = ref(false);
const editMode = ref(false);
const currentParameter = ref<ProjectParameterItem | null>(null);
const formState = ref({
  projectParameterName: '',
  projectParameterValue: '',
  projectParameterDataType: 'VARCHAR',
});

const dataTypeOptions = [
  { value: 'VARCHAR', label: 'VARCHAR' },
  { value: 'INTEGER', label: 'INTEGER' },
  { value: 'LONG', label: 'LONG' },
  { value: 'FLOAT', label: 'FLOAT' },
  { value: 'DOUBLE', label: 'DOUBLE' },
  { value: 'BOOLEAN', label: 'BOOLEAN' },
  { value: 'DATE', label: 'DATE' },
  { value: 'TIMESTAMP', label: 'TIMESTAMP' },
];

const columns = [
  {
    title: '#',
    key: 'index',
    width: 60,
    align: 'center' as const,
    customRender: ({ index }: { index: number }) =>
      (pagination.current - 1) * pagination.pageSize + index + 1,
  },
  {
    title: '参数名称',
    dataIndex: 'paramName',
    key: 'paramName',
    width: 150,
  },
  {
    title: '参数值',
    dataIndex: 'paramValue',
    key: 'paramValue',
    width: 150,
  },
  {
    title: '数据类型',
    dataIndex: 'paramDataType',
    key: 'paramDataType',
    width: 120,
    align: 'center' as const,
  },
  {
    title: '创建人',
    dataIndex: 'createUser',
    key: 'createUser',
    width: 100,
    align: 'center' as const,
  },
  {
    title: '修改人',
    dataIndex: 'modifyUser',
    key: 'modifyUser',
    width: 100,
    align: 'center' as const,
  },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    key: 'createTime',
    width: 170,
    align: 'center' as const,
  },
  {
    title: '更新时间',
    dataIndex: 'updateTime',
    key: 'updateTime',
    width: 170,
    align: 'center' as const,
  },
  {
    title: '操作',
    key: 'actions',
    width: 100,
    align: 'center' as const,
    fixed: 'right' as const,
  },
];

function handleOpenChange(isOpen: boolean) {
  if (isOpen) {
    const data = drawerApi.getData<{
      projectCode: number;
      projectName: string;
    }>();
    projectCode.value = data?.projectCode || 0;
    projectName.value = data?.projectName || '';
    searchVal.value = '';
    pagination.current = 1;
    fetchParameterList();
  }
}

async function fetchParameterList() {
  if (!projectCode.value) return;
  
  loading.value = true;
  try {
    const res = await getProjectParameterList({
      pageSize: pagination.pageSize,
      pageNo: pagination.current,
      projectCode: projectCode.value,
      searchVal: searchVal.value,
    });
    tableData.value = res.totalList || [];
    pagination.total = res.total || 0;
  } catch {
    message.error('获取参数列表失败');
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.current = 1;
  fetchParameterList();
}

function handleTableChange(pag: any) {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchParameterList();
}

function openCreateModal() {
  editMode.value = false;
  currentParameter.value = null;
  formState.value = {
    projectParameterName: '',
    projectParameterValue: '',
    projectParameterDataType: 'VARCHAR',
  };
  modalVisible.value = true;
}

function openEditModal(record: ProjectParameterItem) {
  editMode.value = true;
  currentParameter.value = record;
  formState.value = {
    projectParameterName: record.paramName,
    projectParameterValue: record.paramValue,
    projectParameterDataType: record.paramDataType,
  };
  modalVisible.value = true;
}

async function handleModalOk() {
  if (!formState.value.projectParameterName) {
    message.error('请输入参数名称');
    return;
  }
  if (!formState.value.projectParameterValue) {
    message.error('请输入参数值');
    return;
  }

  modalLoading.value = true;
  try {
    if (editMode.value && currentParameter.value) {
      await updateProjectParameter(projectCode.value, currentParameter.value.code, formState.value);
      message.success('编辑成功');
    } else {
      await createProjectParameter(projectCode.value, formState.value);
      message.success('创建成功');
    }
    modalVisible.value = false;
    fetchParameterList();
  } catch {
    message.error(editMode.value ? '编辑失败' : '创建失败');
  } finally {
    modalLoading.value = false;
  }
}

async function handleDelete(record: ProjectParameterItem) {
  try {
    await deleteProjectParameter(projectCode.value, record.code);
    message.success('删除成功');
    fetchParameterList();
  } catch {
    message.error('删除失败');
  }
}
</script>

<template>
  <Drawer :title="`项目级别参数 - ${projectName}`" class="w-[900px]">
    <Card size="small" :bordered="false">
      <template #title>
        <div class="flex items-center gap-2">
          <IconifyIcon icon="ant-design:tool-outlined" class="text-lg" />
          <span>参数列表</span>
        </div>
      </template>
      <template #extra>
        <Space>
          <Input.Search
            v-model:value="searchVal"
            placeholder="请输入参数名称搜索"
            style="width: 200px"
            allow-clear
            @search="handleSearch"
          />
          <Button type="primary" @click="openCreateModal">
            <template #icon><IconifyIcon icon="ant-design:plus-outlined" /></template>
            创建参数
          </Button>
        </Space>
      </template>

      <Table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1100 }"
        size="small"
        row-key="code"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <Space size="small">
              <Tooltip title="编辑">
                <Button
                  size="small"
                  type="link"
                  @click="openEditModal(record)"
                >
                  <template #icon><IconifyIcon icon="ant-design:edit-outlined" /></template>
                </Button>
              </Tooltip>
              <Popconfirm
                title="确定要删除此参数吗？"
                ok-text="确定"
                cancel-text="取消"
                @confirm="handleDelete(record)"
              >
                <Tooltip title="删除">
                  <Button size="small" type="link" danger>
                    <template #icon><IconifyIcon icon="ant-design:delete-outlined" /></template>
                  </Button>
                </Tooltip>
              </Popconfirm>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <template #footer>
      <VbenButton @click="drawerApi.close()">关闭</VbenButton>
    </template>

    <Modal
      v-model:open="modalVisible"
      :title="editMode ? '编辑参数' : '创建参数'"
      :confirm-loading="modalLoading"
      @ok="handleModalOk"
    >
      <Form layout="vertical">
        <Form.Item label="参数名称" required>
          <Input
            v-model:value="formState.projectParameterName"
            placeholder="请输入参数名称"
            allow-clear
          />
        </Form.Item>
        <Form.Item label="参数值" required>
          <Input
            v-model:value="formState.projectParameterValue"
            placeholder="请输入参数值"
            allow-clear
          />
        </Form.Item>
        <Form.Item label="数据类型" required>
          <Select
            v-model:value="formState.projectParameterDataType"
            :options="dataTypeOptions"
            placeholder="请选择数据类型"
          />
        </Form.Item>
      </Form>
    </Modal>
  </Drawer>
</template>
