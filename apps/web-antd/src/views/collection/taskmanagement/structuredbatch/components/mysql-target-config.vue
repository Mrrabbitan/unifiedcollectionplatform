<script lang="ts" setup>
import { ref, watch, computed, nextTick } from 'vue';
import {
  Form,
  Select,
  Input,
  Radio,
  message,
  Alert,
  Spin,
  Tag,
  Card,
  Space,
  Row,
  Col,
} from 'ant-design-vue';
import { getDataSourceDetailApi, getMetasApi, type DataSourceMeta, type ColumnInfo } from '#/api/datasource/datasource';

interface TablePrimaryKeyConfig {
  tableName: string;
  primaryKeys: string[];
}

interface MySQLTargetConfig {
  datasourceId: number | undefined;
  database: string;
  tableNameMode: 'select' | 'auto';
  tables: string[];
  tablePrefix: string;
  tableSuffix: string;
  primaryKeys: string[];
  tablePrimaryKeys: TablePrimaryKeyConfig[];
  dataSaveMode: 'APPEND_DATA' | 'DROP_DATA';
}

const props = defineProps<{
  modelValue: MySQLTargetConfig;
  sourceTables: string[];
  sourceDatasourceId: number | undefined;
  sourceDatabase: string;
  sourceTablesMeta: DataSourceMeta[];
  editMode?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: MySQLTargetConfig): void;
  (e: 'tableNameModeChange', mode: 'select' | 'auto'): void;
}>();

const config = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const tableOptions = ref<Array<{ label: string; value: string }>>([]);
const loadingTables = ref(false);
const targetTablesMeta = ref<DataSourceMeta[]>([]);
const columnOptions = ref<Array<{ label: string; value: string }>>([]);
const loadingColumns = ref(false);
const isLoadingTableColumns = ref(false);
let loadColumnsTimer: ReturnType<typeof setTimeout> | null = null;
let lastLoadedSourceTables = '';

const isSingleSourceTable = computed(() => props.sourceTables.length === 1);
const isMultipleSourceTables = computed(() => props.sourceTables.length > 1);
const hasDatasource = computed(() => !!config.value.datasourceId);

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
    targetTablesMeta.value = res.totalList || [];
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

function getTableColumnsFromMeta(tableName: string): ColumnInfo[] {
  const tableMeta = targetTablesMeta.value.find(
    (meta) => meta.tableName === tableName
  );
  return tableMeta?.columnsInfo || [];
}

function loadColumnsForSelectedTables() {
  if (!config.value.datasourceId || config.value.tables.length === 0) {
    columnOptions.value = [];
    return;
  }
  
  const allColumns: Set<string> = new Set();
  const allPkColumns: Set<string> = new Set();
  
  for (const tableName of config.value.tables) {
    const columns = getTableColumnsFromMeta(tableName);
    columns.forEach(col => {
      allColumns.add(col.name);
      if (col.primaryKey) {
        allPkColumns.add(col.name);
      }
    });
  }

  columnOptions.value = Array.from(allColumns).map(name => ({
    label: allPkColumns.has(name) ? `${name} (主键)` : name,
    value: name,
  }));

  if (props.editMode) {
    return;
  }

  const existingPks = Array.from(allPkColumns);
  
  config.value = {
    ...config.value,
    primaryKeys: existingPks,
  };
}

function loadColumnsForAllTables() {
  if (!config.value.datasourceId) {
    return;
  }
  
  const newTablePrimaryKeys: TablePrimaryKeyConfig[] = [];
  
  for (const tableName of config.value.tables) {
    const columns = getTableColumnsFromMeta(tableName);
    const existingPks = columns
      .filter(col => col.primaryKey)
      .map(col => col.name);
    
    newTablePrimaryKeys.push({
      tableName,
      primaryKeys: existingPks,
    });
  }

  config.value = {
    ...config.value,
    tablePrimaryKeys: newTablePrimaryKeys,
  };
}

function loadSourceTablePrimaryKeys() {
  if (props.sourceTables.length === 0) {
    return;
  }
  
  const currentTablesKey = props.sourceTables.join(',');
  if (currentTablesKey === lastLoadedSourceTables) {
    return;
  }
  
  const newTablePrimaryKeys: TablePrimaryKeyConfig[] = [];
  
  for (const tableName of props.sourceTables) {
    const tableMeta = props.sourceTablesMeta.find(
      (meta) => meta.tableName === tableName
    );
    
    let existingPks: string[] = [];
    if (tableMeta && tableMeta.columnsInfo) {
      existingPks = tableMeta.columnsInfo
        .filter(col => col.primaryKey)
        .map(col => col.name);
    }
    
    newTablePrimaryKeys.push({
      tableName,
      primaryKeys: existingPks,
    });
  }

  lastLoadedSourceTables = currentTablesKey;
  config.value = {
    ...config.value,
    tablePrimaryKeys: newTablePrimaryKeys,
  };
}

function debouncedLoadColumns() {
  if (loadColumnsTimer) {
    clearTimeout(loadColumnsTimer);
  }
  loadColumnsTimer = setTimeout(() => {
    if (!hasDatasource.value) {
      loadColumnsTimer = null;
      return;
    }
    
    if (config.value.tableNameMode === 'select' && showPrimaryKeyConfig.value) {
      if (config.value.tables.length === 1) {
        loadColumnsForSelectedTables();
      } else if (config.value.tables.length > 1) {
        loadColumnsForAllTables();
      }
    } else if (config.value.tableNameMode === 'auto' && showPrimaryKeyConfig.value) {
      loadSourceTablePrimaryKeys();
    }
    loadColumnsTimer = null;
  }, 300);
}

const previewTableName = computed(() => {
  if (config.value.tableNameMode === 'select') {
    if (config.value.tables.length === 0) {
      return '未选择';
    }
    return config.value.tables.join(', ');
  }
  if (props.sourceTables.length === 0) {
    return '请先在源端选择表';
  }
  const baseName = '${table_name}';
  return `${config.value.tablePrefix}${baseName}${config.value.tableSuffix}`;
});

const tableCountValid = computed(() => {
  if (config.value.tableNameMode !== 'select') return true;
  return config.value.tables.length === props.sourceTables.length;
});

const dataSaveModeOptions = [
  { label: '追加数据', value: 'APPEND_DATA' },
  { label: '覆盖数据', value: 'DROP_DATA' },
];

const showPrimaryKeyConfig = computed(() => {
  return config.value.dataSaveMode === 'APPEND_DATA';
});

const showAutoCreateTablePrimaryKey = computed(() => {
  return config.value.tableNameMode === 'auto';
});

const tableNameModeOptions = computed(() => {
  if (isMultipleSourceTables.value) {
    return [
      { label: '自动建表', value: 'auto', disabled: false },
    ];
  }
  return [
    { label: '选择已存在的表', value: 'select', disabled: false },
    { label: '自动建表', value: 'auto', disabled: false },
  ];
});

const primaryKeyEditable = computed(() => {
  return isSingleSourceTable.value;
});

function handleTableNameModeChange(mode: 'select' | 'auto') {
  config.value = {
    ...config.value,
    tableNameMode: mode,
    tables: [],
    primaryKeys: [],
    tablePrimaryKeys: [],
  };
  lastLoadedSourceTables = '';
  emit('tableNameModeChange', mode);
}

function handleDataSaveModeChange(mode: 'APPEND_DATA' | 'DROP_DATA') {
  const oldMode = config.value.dataSaveMode;
  config.value = {
    ...config.value,
    dataSaveMode: mode,
    primaryKeys: mode === 'DROP_DATA' ? [] : config.value.primaryKeys,
    tablePrimaryKeys: mode === 'DROP_DATA' ? [] : config.value.tablePrimaryKeys,
  };
  
  if (oldMode === 'DROP_DATA' && mode === 'APPEND_DATA') {
    lastLoadedSourceTables = '';
    nextTick(() => {
      debouncedLoadColumns();
    });
  }
}

function handleTablesChange(tables: string[]) {
  config.value = {
    ...config.value,
    tables,
    primaryKeys: [],
    tablePrimaryKeys: [],
  };
}

function handleTablePrimaryKeyChange(tableName: string, primaryKeys: string[]) {
  const newTablePrimaryKeys = config.value.tablePrimaryKeys.map(t => 
    t.tableName === tableName ? { ...t, primaryKeys } : t
  );
  
  const exists = newTablePrimaryKeys.some(t => t.tableName === tableName);
  if (!exists) {
    newTablePrimaryKeys.push({ tableName, primaryKeys });
  }
  
  config.value = {
    ...config.value,
    tablePrimaryKeys: newTablePrimaryKeys,
  };
}

function getTablePrimaryKeyOptions(tableName: string) {
  const columns = getTableColumnsFromMeta(tableName);
  return columns.map(col => ({
    label: col.primaryKey ? `${col.name} (主键)` : col.name,
    value: col.name,
  }));
}

function getTablePrimaryKeys(tableName: string) {
  const tableConfig = config.value.tablePrimaryKeys.find(t => t.tableName === tableName);
  return tableConfig?.primaryKeys || [];
}

watch(() => config.value.datasourceId, (newId, oldId) => {
  if (newId) {
    loadDatabases(newId);
    loadTables(newId);
    if (oldId !== undefined && !props.editMode) {
      config.value = {
        ...config.value,
        tables: [],
        primaryKeys: [],
        tablePrimaryKeys: [],
      };
      columnOptions.value = [];
      lastLoadedSourceTables = '';
    }
    nextTick(() => {
      if (props.sourceTables.length > 1 && config.value.tableNameMode === 'select') {
        config.value = {
          ...config.value,
          tableNameMode: 'auto',
          tables: [],
          primaryKeys: [],
          tablePrimaryKeys: [],
        };
        lastLoadedSourceTables = '';
        emit('tableNameModeChange', 'auto');
      }
      if (config.value.tableNameMode === 'auto' && props.sourceTables.length > 0) {
        lastLoadedSourceTables = '';
        debouncedLoadColumns();
      }
    });
  } else {
    config.value = {
      ...config.value,
      database: '',
      tables: [],
      primaryKeys: [],
      tablePrimaryKeys: [],
    };
    tableOptions.value = [];
    targetTablesMeta.value = [];
    columnOptions.value = [];
    lastLoadedSourceTables = '';
  }
}, { immediate: true });

watch(() => config.value.tables, (newTables, oldTables) => {
  if (!hasDatasource.value) return;
  const tablesChanged = JSON.stringify(newTables) !== JSON.stringify(oldTables);
  if (tablesChanged) {
    debouncedLoadColumns();
  }
}, { deep: true });

watch(() => props.sourceTables, (newTables, oldTables) => {
  if (!hasDatasource.value) return;
  
  if (newTables.length > 1 && config.value.tableNameMode === 'select') {
    handleTableNameModeChange('auto');
  }
  if (config.value.tableNameMode === 'auto') {
    const tablesChanged = JSON.stringify(newTables) !== JSON.stringify(oldTables);
    if (tablesChanged) {
      lastLoadedSourceTables = '';
      debouncedLoadColumns();
    }
  }
});

watch(() => config.value.tableNameMode, (newMode) => {
  if (newMode === 'auto' && hasDatasource.value && props.sourceTables.length > 0) {
    lastLoadedSourceTables = '';
    debouncedLoadColumns();
  }
});

watch(showPrimaryKeyConfig, (newVal) => {
  if (newVal && hasDatasource.value) {
    lastLoadedSourceTables = '';
    debouncedLoadColumns();
  }
});

watch(showAutoCreateTablePrimaryKey, (newVal) => {
  if (newVal && hasDatasource.value && props.sourceTables.length > 0) {
    lastLoadedSourceTables = '';
    debouncedLoadColumns();
  }
});

watch(targetTablesMeta, (newMeta) => {
  if (props.editMode && newMeta.length > 0 && config.value.tables.length > 0) {
    if (config.value.tableNameMode === 'select' && showPrimaryKeyConfig.value) {
      if (config.value.tables.length === 1) {
        loadColumnsForSelectedTables();
      } else {
        loadColumnsForAllTables();
      }
    }
  }
}, { immediate: true });

defineExpose({
  loadDatabases,
  loadTables,
  targetTablesMeta,
});
</script>

<template>
  <div class="mysql-target-config">
    <Form layout="horizontal">
      <Form.Item label="目标表名配置" required>
        <Space :size="16" align="center">
          <Radio.Group
            :value="config.tableNameMode"
            @change="(e: any) => handleTableNameModeChange(e.target.value)"
            :disabled="!hasDatasource"
          >
            <Radio 
              v-for="opt in tableNameModeOptions" 
              :key="opt.value" 
              :value="opt.value"
              :disabled="opt.disabled || !hasDatasource"
            >
              {{ opt.label }}
            </Radio>
          </Radio.Group>
          <Alert
            v-if="isMultipleSourceTables"
            type="info"
            message="源端选择多个表时，目标端只能选择自动建表，主键从源端表自动获取，不可修改"
            show-icon
            style="padding: 4px 12px;"
          />
        </Space>
      </Form.Item>

      <div v-if="config.tableNameMode === 'select'">
        <Row :gutter="20">
          <Col :span="12">
            <Form.Item label="选择表名" required>
              <Spin :spinning="loadingTables">
                <Select
                  :value="config.tables"
                  :options="tableOptions"
                  mode="multiple"
                  placeholder="请选择目标表，数量需与源端一致"
                  show-search
                  :max-tag-count="3"
                  :disabled="!hasDatasource"
                  @change="handleTablesChange"
                />
              </Spin>
            </Form.Item>
          </Col>
          <Col :span="12">
            <Form.Item label="保存模式" required>
              <Select
                :value="config.dataSaveMode"
                :options="dataSaveModeOptions"
                :disabled="!hasDatasource || config.tables.length === 0"
                @change="handleDataSaveModeChange"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row v-if="showPrimaryKeyConfig && isSingleSourceTable && config.tables.length === 1" :gutter="20">
          <Col :span="12">
            <Form.Item label="主键" required>
              <Spin :spinning="loadingColumns">
                <Select
                  :value="config.primaryKeys"
                  :options="columnOptions"
                  mode="multiple"
                  placeholder="请选择主键字段"
                  show-search
                  :max-tag-count="3"
                  @change="(vals: string[]) => { config = { ...config, primaryKeys: vals }; }"
                />
              </Spin>
            </Form.Item>
          </Col>
        </Row>

        <template v-if="showPrimaryKeyConfig && config.tables.length > 1">
          <Alert
            type="info"
            message="源端选择多个表时，主键从源端表自动获取，不可修改"
            show-icon
            style="margin-bottom: 16px;"
          />
          <Spin :spinning="loadingColumns">
            <div class="table-primary-key-list">
              <Card
                v-for="tableName in config.tables"
                :key="tableName"
                size="small"
                class="table-pk-card"
              >
                <template #title>
                  <Tag color="blue">{{ tableName }}</Tag>
                  <span class="pk-label">主键</span>
                </template>
                <div class="primary-key-display">
                  <Tag v-for="pk in getTablePrimaryKeys(tableName)" :key="pk" color="blue">{{ pk }}</Tag>
                  <span v-if="getTablePrimaryKeys(tableName).length === 0" class="no-pk">无主键</span>
                </div>
              </Card>
            </div>
          </Spin>
        </template>
      </div>

      <div v-else>
        <Row :gutter="20">
          <Col :span="8">
            <Form.Item label="目标表名" required>
              <Space.Compact>
                <Input
                  v-model:value="config.tablePrefix"
                  placeholder="前缀"
                  :disabled="!hasDatasource"
                  style="width: 80px;"
                />
                <Input
                  value="源表表名"
                  disabled
                  style="width: 100px; text-align: center; color: #666; background: #fafafa;"
                />
                <Input
                  v-model:value="config.tableSuffix"
                  placeholder="后缀"
                  :disabled="!hasDatasource"
                  style="width: 80px;"
                />
              </Space.Compact>
            </Form.Item>
          </Col>
          <Col :span="8">
            <Form.Item label="表名预览">
              <Alert
                type="info"
                :message="previewTableName"
                show-icon
                style="padding: 4px 12px;"
              />
            </Form.Item>
          </Col>
          <Col :span="8">
            <Form.Item label="保存模式" required>
              <Select
                :value="config.dataSaveMode"
                :options="dataSaveModeOptions"
                :disabled="!hasDatasource"
                style="width: 100%;"
                @change="handleDataSaveModeChange"
              />
            </Form.Item>
          </Col>
        </Row>

        <template v-if="showAutoCreateTablePrimaryKey">

          <Spin :spinning="loadingColumns">
            <div v-if="config.tablePrimaryKeys.length > 0" class="table-primary-key-list">
              <Card
                v-for="tablePk in config.tablePrimaryKeys"
                :key="tablePk.tableName"
                size="small"
                class="table-pk-card"
              >
                <template #title>
                  <Tag color="blue">{{ tablePk.tableName }}</Tag>
                  <span class="pk-label">主键</span>
                </template>
                <div class="primary-key-display">
                  <Tag v-for="pk in tablePk.primaryKeys" :key="pk" color="blue">{{ pk }}</Tag>
                  <span v-if="tablePk.primaryKeys.length === 0" class="no-pk">无主键</span>
                </div>
              </Card>
            </div>
          </Spin>
        </template>
      </div>
    </Form>
  </div>
</template>

<style scoped>
.mysql-target-config {
  padding: 0;
}

.inline-label {
  display: inline-block;
  margin-right: 8px;
  color: rgba(0, 0, 0, 0.85);
  font-size: 14px;
}

.inline-label::before {
  content: '*';
  color: #ff4d4f;
  margin-right: 4px;
}

.table-primary-key-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.table-pk-card {
  border: 1px solid #e8e8e8;
}

.table-pk-card :deep(.ant-card-head) {
  min-height: 40px;
  padding: 0 12px;
}

.table-pk-card :deep(.ant-card-body) {
  padding: 12px;
}

.pk-label {
  margin-left: 8px;
  color: #666;
}

.primary-key-display {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.no-pk {
  color: #999;
  font-size: 12px;
}
</style>
