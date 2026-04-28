<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';

import {
  Button,
  Card,
  Checkbox,
  Divider,
  Form,
  FormItem,
  Input,
  InputNumber,
  Select,
  Switch,
} from 'ant-design-vue';
import { Plus, Trash } from '@vben/icons';

import { getDataSourceList } from '#/api/datasource/datasource';
import type { DataSourceInfo } from '#/api/datasource/datasource';

interface CustomParam {
  prop: string;
  direct: 'IN' | 'OUT';
  type: string;
  value: string;
}

interface SqlStatement {
  sql: string;
}

const props = defineProps<{
  value?: any;
  disabled?: boolean;
  availableNodes?: { code: number; name: string }[];
  currentNodeCode?: number;
  preTasks?: number[];
}>();

const emit = defineEmits<{
  'update:value': [value: any];
  'update:preTasks': [preTasks: number[]];
}>();

const formData = ref({
  name: '',
  description: '',
  timeoutFlag: false,
  timeoutNotifyStrategy: ['WARN'] as string[],
  timeout: 30,
  type: 'MYSQL',
  datasource: undefined as number | undefined,
  sqlType: '0',
  displayRows: 10,
  sql: '',
  localParams: [] as CustomParam[],
  preStatements: [] as SqlStatement[],
  postStatements: [] as SqlStatement[],
});

const selectedPreTasks = ref<number[]>([]);

const dataSourceList = ref<DataSourceInfo[]>([]);
const loading = ref(false);

const dataSourceTypeOptions = [
  { label: 'MySQL', value: 'MYSQL' },
  { label: 'PostgreSQL', value: 'POSTGRESQL' },
  { label: 'Hive', value: 'HIVE' },
  { label: 'Spark', value: 'SPARK' },
  { label: 'ClickHouse', value: 'CLICKHOUSE' },
  { label: 'Oracle', value: 'ORACLE' },
  { label: 'SQL Server', value: 'SQLSERVER' },
  { label: 'DB2', value: 'DB2' },
  { label: 'Presto', value: 'PRESTO' },
  { label: 'Redshift', value: 'REDSHIFT' },
  { label: 'Athena', value: 'ATHENA' },
  { label: 'Trino', value: 'TRINO' },
  { label: 'Azure SQL', value: 'AZURESQL' },
  { label: '达梦', value: 'DAMENG' },
  { label: 'OceanBase', value: 'OCEANBASE' },
  { label: 'Databend', value: 'DATABEND' },
  { label: 'Kyuubi', value: 'KYUUBI' },
  { label: 'Vertica', value: 'VERTICA' },
  { label: 'HANA', value: 'HANA' },
  { label: 'Doris', value: 'DORIS' },
  { label: 'Zeppelin', value: 'ZEPPELIN' },
  { label: 'SageMaker', value: 'SAGEMAKER' },
  { label: '阿里云Serverless Spark', value: 'ALIYUN_SERVERLESS_SPARK' },
  { label: 'DolphinDB', value: 'DOLPHINDB' },
  { label: 'MaxCompute', value: 'MAXCOMPUTE' },
];

const sqlTypeOptions = [
  { label: '查询', value: '0' },
  { label: '非查询', value: '1' },
];

const displayRowsOptions = [
  { label: '1', value: 1 },
  { label: '10', value: 10 },
  { label: '25', value: 25 },
  { label: '50', value: 50 },
  { label: '100', value: 100 },
];

const directOptions = [
  { label: 'IN', value: 'IN' },
  { label: 'OUT', value: 'OUT' },
];

const typeOptions = [
  { label: 'VARCHAR', value: 'VARCHAR' },
  { label: 'INTEGER', value: 'INTEGER' },
  { label: 'LONG', value: 'LONG' },
  { label: 'FLOAT', value: 'FLOAT' },
  { label: 'DOUBLE', value: 'DOUBLE' },
  { label: 'DATE', value: 'DATE' },
  { label: 'TIME', value: 'TIME' },
  { label: 'TIMESTAMP', value: 'TIMESTAMP' },
];

const timeoutStrategyOptions = [
  { label: '超时告警', value: 'WARN' },
  { label: '超时失败', value: 'FAILED' },
];

const dataSourceInstanceOptions = computed(() => {
  return dataSourceList.value.map((item) => ({
    label: item.name,
    value: item.id,
  }));
});

const preTaskOptions = computed(() => {
  return (props.availableNodes || [])
    .filter((node) => node.code !== props.currentNodeCode)
    .map((node) => ({
      label: node.name,
      value: node.code,
    }));
});

function handlePreTasksChange(values: number[]) {
  selectedPreTasks.value = values;
  emit('update:preTasks', values);
}

async function fetchDataSourceList() {
  if (!formData.value.type) return;
  
  loading.value = true;
  try {
    const data = await getDataSourceList(formData.value.type);
    dataSourceList.value = data || [];
  } catch (error) {
    console.error('Failed to fetch datasource list:', error);
    dataSourceList.value = [];
  } finally {
    loading.value = false;
  }
}

function handleDataSourceTypeChange() {
  formData.value.datasource = undefined;
  fetchDataSourceList();
}

function addCustomParam() {
  formData.value.localParams.push({
    prop: '',
    direct: 'IN',
    type: 'VARCHAR',
    value: '',
  });
  emitUpdate();
}

function removeCustomParam(index: number) {
  formData.value.localParams.splice(index, 1);
  emitUpdate();
}

function addPreStatement() {
  formData.value.preStatements.push({ sql: '' });
  emitUpdate();
}

function removePreStatement(index: number) {
  formData.value.preStatements.splice(index, 1);
  emitUpdate();
}

function addPostStatement() {
  formData.value.postStatements.push({ sql: '' });
  emitUpdate();
}

function removePostStatement(index: number) {
  formData.value.postStatements.splice(index, 1);
  emitUpdate();
}

function emitUpdate() {
  emit('update:value', {
    name: formData.value.name,
    description: formData.value.description,
    timeoutFlag: formData.value.timeoutFlag ? 'OPEN' : 'CLOSE',
    timeoutNotifyStrategy: formData.value.timeoutNotifyStrategy,
    timeout: formData.value.timeout,
    type: formData.value.type,
    datasource: formData.value.datasource,
    sqlType: formData.value.sqlType,
    displayRows: formData.value.displayRows,
    sql: formData.value.sql,
    localParams: formData.value.localParams,
    preStatements: formData.value.preStatements.map(s => s.sql),
    postStatements: formData.value.postStatements.map(s => s.sql),
  });
}

watch(
  () => props.value,
  (val) => {
    if (val) {
      formData.value = {
        name: val.name || '',
        description: val.description || '',
        timeoutFlag: val.timeoutFlag === 'OPEN',
        timeoutNotifyStrategy: val.timeoutNotifyStrategy || ['WARN'],
        timeout: val.timeout || 30,
        type: val.type || 'MYSQL',
        datasource: val.datasource,
        sqlType: val.sqlType || '0',
        displayRows: val.displayRows || 10,
        sql: val.sql || '',
        localParams: val.localParams || [],
        preStatements: (val.preStatements || []).map((sql: string) => ({ sql })),
        postStatements: (val.postStatements || []).map((sql: string) => ({ sql })),
      };
      fetchDataSourceList();
    }
  },
  { immediate: true }
);

watch(
  () => props.preTasks,
  (val) => {
    if (val) {
      selectedPreTasks.value = [...val];
    }
  },
  { immediate: true }
);

onMounted(() => {
  fetchDataSourceList();
});
</script>

<template>
  <div class="sql-task-form">
    <Card title="基本信息" :bordered="false" class="form-card">
      <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <FormItem label="节点名称" required>
          <Input
            v-model:value="formData.name"
            placeholder="请输入节点名称"
            :disabled="disabled"
            @change="emitUpdate"
          />
        </FormItem>

        <FormItem label="描述">
          <Input.TextArea
            v-model:value="formData.description"
            placeholder="请输入描述"
            :rows="3"
            :disabled="disabled"
            @change="emitUpdate"
          />
        </FormItem>
      </Form>
    </Card>

    <Card title="超时设置" :bordered="false" class="form-card">
      <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <FormItem label="超时告警">
          <Switch
            v-model:checked="formData.timeoutFlag"
            :disabled="disabled"
            @change="emitUpdate"
          />
        </FormItem>

        <template v-if="formData.timeoutFlag">
          <FormItem label="超时策略">
            <Checkbox.Group
              v-model:value="formData.timeoutNotifyStrategy"
              :disabled="disabled"
              @change="emitUpdate"
            >
              <Checkbox
                v-for="opt in timeoutStrategyOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </Checkbox>
            </Checkbox.Group>
          </FormItem>

          <FormItem label="超时时间">
            <InputNumber
              v-model:value="formData.timeout"
              :min="1"
              :disabled="disabled"
              addon-after="分钟"
              style="width: 200px"
              @change="emitUpdate"
            />
          </FormItem>
        </template>
      </Form>
    </Card>

    <Card title="数据源配置" :bordered="false" class="form-card">
      <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <FormItem label="数据源类型" required>
          <Select
            v-model:value="formData.type"
            :options="dataSourceTypeOptions"
            placeholder="请选择数据源类型"
            :disabled="disabled"
            @change="handleDataSourceTypeChange"
          />
        </FormItem>

        <FormItem label="数据源实例" required>
          <Select
            v-model:value="formData.datasource"
            :options="dataSourceInstanceOptions"
            placeholder="请选择数据源实例"
            :disabled="disabled"
            :loading="loading"
            @change="emitUpdate"
          />
        </FormItem>

        <FormItem label="SQL类型">
          <Select
            v-model:value="formData.sqlType"
            :options="sqlTypeOptions"
            placeholder="请选择SQL类型"
            :disabled="disabled"
            @change="emitUpdate"
          />
        </FormItem>

        <FormItem label="日志显示">
          <Select
            v-model:value="formData.displayRows"
            :options="displayRowsOptions"
            placeholder="请选择日志显示行数"
            :disabled="disabled"
            style="width: 200px"
            @change="emitUpdate"
          />
        </FormItem>
      </Form>
    </Card>

    <Card title="SQL语句" :bordered="false" class="form-card">
      <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <FormItem label="SQL语句" required>
          <Input.TextArea
            v-model:value="formData.sql"
            placeholder="请输入SQL语句"
            :rows="10"
            :disabled="disabled"
            style="font-family: monospace"
            @change="emitUpdate"
          />
        </FormItem>
      </Form>
    </Card>

    <Card title="自定义参数" :bordered="false" class="form-card">
      <div class="param-section">
        <Button
          type="dashed"
          :disabled="disabled"
          @click="addCustomParam"
        >
          <Plus class="mr-1 size-4" />
          添加参数
        </Button>

        <div v-if="formData.localParams.length > 0" class="param-list">
          <div
            v-for="(param, index) in formData.localParams"
            :key="index"
            class="param-item"
          >
            <Input
              v-model:value="param.prop"
              placeholder="参数名"
              :disabled="disabled"
              style="width: 150px"
              @change="emitUpdate"
            />
            <Select
              v-model:value="param.direct"
              :options="directOptions"
              :disabled="disabled"
              style="width: 100px"
              @change="emitUpdate"
            />
            <Select
              v-model:value="param.type"
              :options="typeOptions"
              :disabled="disabled"
              style="width: 120px"
              @change="emitUpdate"
            />
            <Input
              v-model:value="param.value"
              placeholder="参数值"
              :disabled="disabled"
              style="flex: 1"
              @change="emitUpdate"
            />
            <Button
              type="text"
              danger
              :disabled="disabled"
              @click="removeCustomParam(index)"
            >
              <Trash class="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <Card title="前置SQL语句" :bordered="false" class="form-card">
      <div class="param-section">
        <Button
          type="dashed"
          :disabled="disabled"
          @click="addPreStatement"
        >
          <Plus class="mr-1 size-4" />
          添加前置SQL
        </Button>

        <div v-if="formData.preStatements.length > 0" class="param-list">
          <div
            v-for="(stmt, index) in formData.preStatements"
            :key="index"
            class="statement-item"
          >
            <Input.TextArea
              v-model:value="stmt.sql"
              placeholder="请输入SQL语句"
              :rows="2"
              :disabled="disabled"
              style="flex: 1; font-family: monospace"
              @change="emitUpdate"
            />
            <Button
              type="text"
              danger
              :disabled="disabled"
              @click="removePreStatement(index)"
            >
              <Trash class="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <Card title="后置SQL语句" :bordered="false" class="form-card">
      <div class="param-section">
        <Button
          type="dashed"
          :disabled="disabled"
          @click="addPostStatement"
        >
          <Plus class="mr-1 size-4" />
          添加后置SQL
        </Button>

        <div v-if="formData.postStatements.length > 0" class="param-list">
          <div
            v-for="(stmt, index) in formData.postStatements"
            :key="index"
            class="statement-item"
          >
            <Input.TextArea
              v-model:value="stmt.sql"
              placeholder="请输入SQL语句"
              :rows="2"
              :disabled="disabled"
              style="flex: 1; font-family: monospace"
              @change="emitUpdate"
            />
            <Button
              type="text"
              danger
              :disabled="disabled"
              @click="removePostStatement(index)"
            >
              <Trash class="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>

    <Card title="前置任务" :bordered="false" class="form-card">
      <Form :label-col="{ span: 4 }" :wrapper-col="{ span: 20 }">
        <FormItem label="选择前置任务">
          <Select
            v-model:value="selectedPreTasks"
            mode="multiple"
            :options="preTaskOptions"
            placeholder="请选择前置任务节点"
            :disabled="disabled"
            style="width: 100%"
            @change="handlePreTasksChange"
          />
        </FormItem>
      </Form>
    </Card>
  </div>
</template>

<style scoped>
.sql-task-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-card {
  margin-bottom: 0;
}

.form-card :deep(.ant-card-head) {
  min-height: 40px;
  padding: 0 16px;
  background: #fafafa;
}

.form-card :deep(.ant-card-head-title) {
  padding: 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.form-card :deep(.ant-card-body) {
  padding: 16px;
}

.param-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.param-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}

.statement-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  background: #fafafa;
  border-radius: 4px;
}
</style>
