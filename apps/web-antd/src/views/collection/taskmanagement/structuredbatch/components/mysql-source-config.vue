<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import {
  Form,
  Select,
  Input,
  Row,
  Col,
  Tag,
  message,
  Spin,
  Button,
  Space,
  Card,
} from 'ant-design-vue';
import { getDataSourceDetailApi, getMetasApi, type DataSourceMeta } from '#/api/datasource/datasource';

interface MySQLSourceConfig {
  datasourceId: number | undefined;
  database: string;
  tables: string[];
  tableQueries: Record<string, string>;
}

const props = defineProps<{
  modelValue: MySQLSourceConfig;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: MySQLSourceConfig): void;
}>();

const config = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const tableOptions = ref<Array<{ label: string; value: string }>>([]);
const loadingTables = ref(false);
const allTables = ref<DataSourceMeta[]>([]);

async function loadDatabases(datasourceId: number) {
  try {
    const detail = await getDataSourceDetailApi(datasourceId);
    config.value = {
      ...config.value,
      database: detail.database || '',
    };
  } catch {
    message.error('获取数据库信息失败');
  }
}

async function loadTables(datasourceId: number) {
  loadingTables.value = true;
  try {
    const res = await getMetasApi(datasourceId, 1, 20000);
    allTables.value = res.totalList || [];
    tableOptions.value = (res.totalList || []).map((item: DataSourceMeta) => ({
      label: item.tableName,
      value: item.tableName,
    }));
  } catch {
    message.error('获取表列表失败');
  } finally {
    loadingTables.value = false;
  }
}

function handleSelectAll() {
  const allTableNames = tableOptions.value.map(t => t.value);
  config.value = {
    ...config.value,
    tables: allTableNames,
  };
}

function handleClearAll() {
  config.value = {
    ...config.value,
    tables: [],
    tableQueries: {},
  };
}

function handleTableChange(tables: string[]) {
  const newTableQueries: Record<string, string> = {};
  tables.forEach(table => {
    newTableQueries[table] = config.value.tableQueries[table] || '';
  });
  config.value = {
    ...config.value,
    tables,
    tableQueries: newTableQueries,
  };
}

function handleQueryChange(table: string, query: string) {
  config.value = {
    ...config.value,
    tableQueries: {
      ...config.value.tableQueries,
      [table]: query,
    },
  };
}

function getTablePrimaryKeys(tableName: string): string[] {
  const tableMeta = allTables.value.find((m) => m.tableName === tableName);
  if (tableMeta && tableMeta.columnsInfo) {
    return tableMeta.columnsInfo
      .filter(col => col.primaryKey)
      .map(col => col.name);
  }
  return [];
}

watch(() => config.value.datasourceId, (newId, oldId) => {
  if (newId) {
    loadDatabases(newId);
    loadTables(newId);
    if (oldId !== undefined) {
      config.value = {
        ...config.value,
        tables: [],
        tableQueries: {},
      };
    }
  } else {
    tableOptions.value = [];
    allTables.value = [];
    config.value = {
      ...config.value,
      database: '',
      tables: [],
      tableQueries: {},
    };
  }
}, { immediate: true });

defineExpose({
  loadTables,
  loadDatabases,
  allTables,
});
</script>

<template>
  <div class="mysql-source-config">
    <Form layout="horizontal">
      <Form.Item label="表名选择" required>
        <Row :gutter="8" align="middle">
          <Col :span="18">
            <Spin :spinning="loadingTables">
              <Select
                :value="config.tables"
                :options="tableOptions"
                mode="multiple"
                placeholder="请选择要采集的表"
                show-search
                :max-tag-count="3"
                :disabled="!config.datasourceId"
                style="width: 100%;"
                @change="handleTableChange"
              />
            </Spin>
          </Col>
          <Col :span="6">
            <Space>
              <Button type="primary" @click="handleSelectAll" :disabled="tableOptions.length === 0">
                全选
              </Button>
              <Button @click="handleClearAll" :disabled="config.tables.length === 0">
                清空
              </Button>
            </Space>
          </Col>
        </Row>
      </Form.Item>

      <div v-if="config.tables.length > 0" class="selected-tables">
        <div class="label">已选择 {{ config.tables.length }} 个表</div>
        
        <div class="table-query-list">
          <Card
            v-for="table in config.tables"
            :key="table"
            size="small"
            class="table-query-card"
          >
            <template #title>
              <div style="display: flex; align-items: center; gap: 8px;">
                <Tag color="blue">{{ table }}</Tag>
                <template v-if="getTablePrimaryKeys(table).length > 0">
                  <span style="color: #666; font-size: 12px;">主键：</span>
                  <Tag v-for="pk in getTablePrimaryKeys(table)" :key="pk" color="green">{{ pk }}</Tag>
                </template>
                <span v-else style="color: #999; font-size: 12px;">无主键</span>
              </div>
            </template>
            <Form.Item label="查询条件" class="query-form-item">
              <Input.TextArea
                :value="config.tableQueries[table] || ''"
                placeholder="可选，输入查询条件，如：select * from table where status = 1"
                :rows="2"
                @change="(e: any) => handleQueryChange(table, e.target.value)"
              />
            </Form.Item>
          </Card>
        </div>
      </div>
    </Form>
  </div>
</template>

<style scoped>
.mysql-source-config {
  padding: 0;
}

.selected-tables {
  margin-top: 16px;
}

.selected-tables .label {
  font-weight: 500;
  margin-bottom: 12px;
  display: block;
}

.table-query-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.table-query-card {
  border: 1px solid #e8e8e8;
}

.table-query-card :deep(.ant-card-head) {
  min-height: 40px;
  padding: 0 12px;
}

.table-query-card :deep(.ant-card-body) {
  padding: 12px;
}

.query-form-item {
  margin-bottom: 0;
}
</style>
