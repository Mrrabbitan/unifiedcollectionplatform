<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';

import { useI18n } from '@vben/locales'
import { Page } from '@vben/common-ui'
import { useTabs } from '@vben/hooks';

import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

import type { 
  TaskDefinition,
  TaskParams, 
  JobEnvConfig, 
  CDCSource, 
  CommonSource, 
  MaxComputeSource, 
  TaskRelation,
  NodeLocation,
  TaskData,
  MysqlConfig,
  PostgresqlConfig,
  TargetDbConfig,
  MaxcomputeConfig,
  TaskConfig,
  EngineConfig,
} from '#/api/cdc';

import { getTaskCodeList, 
  createCDCWorkflowDefinition, 
  getWorkflowStreamCDCData, 
  updateCDCWorkflowDefinition,
  verifyWorkflowName, 
  type VerifyNameResponse 
} from '#/api/taskmanagement';

import {
  Button,
  Card,
  Steps,
  Form,
  Input,
  InputNumber,
  Select,
  Divider,
  message,
  Row,
  Col,
  Switch,
  Spin,
  Radio,
  AutoComplete,
  Checkbox,
  Space,
  DatePicker
} from 'ant-design-vue';

import {
  getDataSourceList,
  getDataSourceConnectionParamsApi,
  getMetasList,
  type DataSourceInfo,
  type DataSourceMeta,
} from '#/api/datasource/datasource';

import { getEnvironmentListApi, type EnvironmentInfo } from '#/api/environment';
import { useRouter, useRoute } from 'vue-router';
import { useProjectStore } from '#/store';
import { useAiTaskDraftStore } from '#/store/ai-task-draft';

const { t } = useI18n();

defineOptions({ name: 'CdcTask' });

const Step = Steps.Step;

const currentStep = ref(0);

const route = useRoute();
const router = useRouter();
const { closeTabByKey } = useTabs();
const code = computed(() => route.query.code as string || '');
const isEditMode = computed(() => code.value !== '');
const projectStore = useProjectStore();

const sourceType = ref<string>('MYSQL');
const datasourceId = ref<number | undefined>();
const tableName = ref<string>('');

const datasourceOptions = ref<Array<{ label: string; value: number }>>([]);
const tableOptions = ref<Array<{ label: string; value: string }>>([]);

const startupTimestampPicker = ref<Dayjs | undefined>(undefined);

const mysqlConfig = ref<MysqlConfig>({
  startupMode: 'initial',
  binlogName: '',
  binlogPosition: undefined,
  startupTimestamp: undefined,
  stopMode: 'never',
  stopBinlogName: '',
  stopBinlogPosition: undefined,
  timeout: 3000,
  retryTimes: 3,
  connectionPool: 20,
});

const postgresqlConfig = ref<PostgresqlConfig>({
  startupMode: 'initial',
  decodePlugin: 'pgoutput',
  timeout: 3000,
  retryTimes: 3,
  connectionPool: 20,
});

const targetSourceType = ref<string>('MYSQL');
const targetDatasourceId = ref<number | undefined>();
const targetTableName = ref<string>('');

const targetDatasourceOptions = ref<Array<{ label: string; value: number }>>([]);
const targetTableOptions = ref<Array<{ label: string; value: string }>>([]);

const targetDbConfig = ref<TargetDbConfig>({
  schemaMode: 'CREATE_SCHEMA_WHEN_NOT_EXIST',
  dataMode: 'APPEND_DATA',
  customSql: '',
  retry: 0,
  cacheRows: 1000,
  transactionRetry: 3,
});

const maxcomputeConfig = ref<MaxcomputeConfig>({
  overwriteData: false,
  schemaMode: 'CREATE_SCHEMA_WHEN_NOT_EXIST',
  dataMode: 'APPEND_DATA',
  customSql: '',
});

const sourceFields = ref<string[]>([]);
const targetFields = ref<string[]>([]);
const fieldMapping = ref<Map<string, string>>(new Map());
const loadingFields = ref(false);
const fieldsLoaded = ref(false);
const srcConnectionParams = ref<string>('');
const targetConnectionParams = ref<string>('');
const isInitializing = ref(false);
const pageLoading = ref(false);

const sourceDatasourceLoading = ref(false);
const sourceTableLoading = ref(false);
const targetDatasourceLoading = ref(false);
const targetTableLoading = ref(false);

const lastLoadedSource = ref<{ datasourceId?: number; tableName: string }>({ datasourceId: undefined, tableName: '' });
const lastLoadedTarget = ref<{ datasourceId?: number; tableName: string }>({ datasourceId: undefined, tableName: '' });

const mappingContainerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(800);
const containerHeight = ref(400);

const isDragging = ref(false);
const dragSourceField = ref<string | null>(null);
const dragLine = ref({ x1: 0, y1: 0, x2: 0, y2: 0 });

const taskConfig = ref<TaskConfig>({
  jobName: '',
  description: '',
  priority: 'MEDIUM',
  workerGroup: 'default',
  environment: 0,
  retryTimes: 0,
  retryInterval: 1,
  cpuQuota: -1,
  maxMemory: -1,
  delayTime: 0,
  timeoutFlag: false,
  timeoutAlert: false,
  timeoutStrategy: [],
  timeout: 0,
  execStrategy: 'PARALLEL',
});

const engineConfig = ref<EngineConfig>({
  engine: 'seatunnel.sh',
  deployMode: 'local',
  parallelism: 4,
  checkpointInterval: 30000,
  checkpointTimeout: 30000,
  checkpointAddress: '',
  taskmanagerMemory: 1,
  jobmanagerMemory: 1,
  yarnQueue: '',
});

const taskData = ref<TaskData>({
  source: {
    type: 'MYSQL',
    datasourceId: undefined,
    tableName: '',
    config: {
      startupMode: 'initial',
      binlogName: '',
      binlogPosition: undefined,
      startupTimestamp: undefined,
      stopMode: 'never',
      stopBinlogName: '',
      stopBinlogPosition: undefined,
      timeout: 3000,
      retryTimes: 3,
      connectionPool: 20,
    },
  },
  target: {
    type: 'MYSQL',
    datasourceId: undefined,
    tableName: '',
    config: {
      schemaMode: 'CREATE_SCHEMA_WHEN_NOT_EXIST',
      dataMode: 'APPEND_DATA',
      customSql: '',
      retry: 0,
      cacheRows: 1000,
      transactionRetry: 3,
    },
  },
  fieldMapping: {},
  taskConfig: {
    jobName: '',
    description: '',
    priority: 'MEDIUM',
    workerGroup: 'default',
    environment: 0,
    retryTimes: 0,
    retryInterval: 1,
    cpuQuota: -1,
    maxMemory: -1,
    delayTime: 0,
    timeoutFlag: false,
    timeoutAlert: false,
    timeoutStrategy: [],
    timeout: 0,
    execStrategy: 'PARALLEL',
  },
  engineConfig: {
    engine: 'seatunnel.sh',
    deployMode: 'local',
    parallelism: 4,
    checkpointInterval: 30000,
    checkpointTimeout: 30000,
    checkpointAddress: '',
    taskmanagerMemory: 1,
    jobmanagerMemory: 1,
    yarnQueue: '',
  },
});


const sourceTypeOptions = [
  { label: 'MYSQL', value: 'MYSQL' },
  { label: 'POSTGRESQL', value: 'POSTGRESQL' },
];

const targetSourceTypeOptions = [
  { label: 'MYSQL', value: 'MYSQL' },
  { label: 'POSTGRESQL', value: 'POSTGRESQL' },
  { label: 'OCEANBASE', value: 'OCEANBASE' },
  { label: 'MAXCOMPUTE', value: 'MAXCOMPUTE' },
];

const priorityOptions = [
  { label: 'HIGHEST', value: 'HIGHEST' },
  { label: 'HIGH', value: 'HIGH' },
  { label: 'MEDIUM', value: 'MEDIUM' },
  { label: 'LOW', value: 'LOW' },
  { label: 'LOWEST', value: 'LOWEST' },
];

const workerGroupOptions = [
  { label: 'default', value: 'default' },
];

const environmentOptions = ref<Array<{ label: string; value: number }>>([]);

const engineOptions = [
  { label: 'seatunnel', value: 'seatunnel.sh' },
  { label: 'flink-13', value: 'start-seatunnel-flink-13-connector-v2.sh' },
  { label: 'flink-15', value: 'start-seatunnel-flink-15-connector-v2.sh' },
];

const execStrategyOptions = [
  { label: '并行', value: 'PARALLEL' },
  { label: '串行等待', value: 'SERIAL_WAIT' },
  { label: '串行抛弃', value: 'SERIAL_DISCARD' },
  { label: '串行优先', value: 'SERIAL_PRIORITY' },
];

const startupModeOptions = [
  { label: 'initial', value: 'initial' },
  { label: 'earliest', value: 'earliest' },
  { label: 'latest', value: 'latest' },
  { label: 'timestamp', value: 'timestamp' },
  { label: 'specific', value: 'specific' },
];

const postgresqlStartupModeOptions = [
  { label: 'initial', value: 'initial' },
  { label: 'earliest', value: 'earliest' },
  { label: 'latest', value: 'latest' },
];

const stopModeOptions = [
  { label: 'never', value: 'never' },
  { label: 'latest', value: 'latest' },
  { label: 'specific', value: 'specific' },
];

const decodePluginOptions = [
  { label: 'pgoutput', value: 'pgoutput' },
  { label: 'decoderbufs', value: 'decoderbufs' },
  { label: 'wal2json', value: 'wal2json' },
  { label: 'wal2json_rds', value: 'wal2json_rds' },
  { label: 'wal2json_streaming', value: 'wal2json_streaming' },
  { label: 'wal2json_rds_streaming', value: 'wal2json_rds_streaming' },
];

const schemaModeOptions = [
  { label: 'CREATE_SCHEMA_WHEN_NOT_EXIST', value: 'CREATE_SCHEMA_WHEN_NOT_EXIST' },
  { label: 'RECREATE_SCHEMA', value: 'RECREATE_SCHEMA' },
  { label: 'ERROR_WHEN_SCHEMA_NOT_EXIST', value: 'ERROR_WHEN_SCHEMA_NOT_EXIST' },
  { label: 'IGNORE', value: 'IGNORE' },
];

const dataModeOptions = [
  { label: 'APPEND_DATA', value: 'APPEND_DATA' },
  { label: 'DROP_DATA', value: 'DROP_DATA' },
  { label: 'ERROR_WHEN_DATA_EXISTS', value: 'ERROR_WHEN_DATA_EXISTS' },
  { label: 'CUSTOM_PROCESSING', value: 'CUSTOM_PROCESSING' },
];

async function loadDatasourceList() {
  if (!sourceType.value) return;
  sourceDatasourceLoading.value = true;
  try {
    const res = await getDataSourceList(sourceType.value);
    datasourceOptions.value = (res || []).map((item: DataSourceInfo) => ({
      label: item.name,
      value: item.id,
    }));
  } catch {
    message.error('获取数据源列表失败');
  } finally {
    sourceDatasourceLoading.value = false;
  }
}

async function loadTableList() {
  if (!datasourceId.value) return;
  sourceTableLoading.value = true;
  try {
    const res = await getMetasList(datasourceId.value);
    tableOptions.value = (res || []).map((item: DataSourceMeta) => ({
      label: item.tableName,
      value: item.tableName,
    }));
  } catch {
    message.error('获取表列表失败');
  } finally {
    sourceTableLoading.value = false;
  }

  try {
    const datasourceDetail = await getDataSourceConnectionParamsApi(datasourceId.value);
    srcConnectionParams.value = (datasourceDetail.connectionParams as string);
  } catch {
    // ignore
  }
}

async function loadTargetDatasourceList() {
  if (!targetSourceType.value) return;
  targetDatasourceLoading.value = true;
  try {
    const res = await getDataSourceList(targetSourceType.value);
    targetDatasourceOptions.value = (res || []).map((item: DataSourceInfo) => ({
      label: item.name,
      value: item.id,
    }));
  } catch {
    message.error('获取目标端数据源列表失败');
  } finally {
    targetDatasourceLoading.value = false;
  }
}

async function loadTargetTableList() {
  if (!targetDatasourceId.value) return;
  targetTableLoading.value = true;
  try {
    const res = await getMetasList(targetDatasourceId.value);
    targetTableOptions.value = (res || []).map((item: DataSourceMeta) => ({
      label: item.tableName,
      value: item.tableName,
    }));
  } catch {
    message.error('获取目标端表列表失败');
  } finally {
    targetTableLoading.value = false;
  }

  const datasourceDetail = await getDataSourceConnectionParamsApi(targetDatasourceId.value);
  targetConnectionParams.value = (datasourceDetail.connectionParams as string);
}

async function loadEnvironmentList() {
  try {
    const res = await getEnvironmentListApi();
    environmentOptions.value = (res || []).map((item: EnvironmentInfo) => ({
      label: item.name,
      value: item.code,
    }));
    if (environmentOptions.value.length > 0 && !taskConfig.value.environment) {
      taskConfig.value.environment = environmentOptions.value[0]?.value || 0;
    }
  } catch {
    message.error('获取环境列表失败');
  }
}

async function loadFieldLists() {
  if (!datasourceId.value || !targetDatasourceId.value || !tableName.value || !targetTableName.value) {
    return;
  }
  
  loadingFields.value = true;
  try {
    const [sourceMetas, targetMetas] = await Promise.all([
      getMetasList(datasourceId.value),
      getMetasList(targetDatasourceId.value),
    ]);
    
    const sourceMeta = sourceMetas?.find((m: DataSourceMeta) => m.tableName === tableName.value);
    const targetMeta = targetMetas?.find((m: DataSourceMeta) => m.tableName === targetTableName.value);
    let sourceColumnNames = sourceMeta?.columnNames || [];
    let targetColumnNames = targetMeta?.columnNames || [];
    
    if (sourceColumnNames.length === 0 && targetColumnNames.length === 0) {
      message.error('源端和目标端表都没有字段信息，无法进行字段映射');
      loadingFields.value = false;
      return;
    }
    
    if (sourceColumnNames.length === 0) {
      sourceColumnNames = [...targetColumnNames];
      message.warning('源端表没有字段信息，已复制目标端字段');
    }
    
    if (targetColumnNames.length === 0) {
      targetColumnNames = [...sourceColumnNames];
      message.warning('目标端表没有字段信息，已复制源端字段');
    }
    
    sourceFields.value = sourceColumnNames;
    targetFields.value = targetColumnNames;
    
    if (!isInitializing.value) {
      fieldMapping.value.clear();
      for (const sourceField of sourceFields.value) {
        if (targetFields.value.includes(sourceField)) {
          fieldMapping.value.set(sourceField, sourceField);
        }
      }
    }
    
    lastLoadedSource.value = { datasourceId: datasourceId.value, tableName: tableName.value };
    lastLoadedTarget.value = { datasourceId: targetDatasourceId.value, tableName: targetTableName.value };
    
    fieldsLoaded.value = true;
    
    await nextTick();
    updateContainerSize();
  } catch {
    message.error('获取字段列表失败');
  } finally {
    loadingFields.value = false;
  }
}

const mappingEntries = computed(() => Array.from(fieldMapping.value.entries()));
const mappedSourceFields = computed(() => new Set(fieldMapping.value.keys()));
const mappedTargetFields = computed(() => new Set(fieldMapping.value.values()));
const mappingCount = computed(() => fieldMapping.value.size);

function updateContainerSize() {
  if (mappingContainerRef.value) {
    const rect = mappingContainerRef.value.getBoundingClientRect();
    containerWidth.value = rect.width;
    containerHeight.value = Math.max(sourceFields.value.length, targetFields.value.length) * 40 + 80;
  }
}

function getFieldY(index: number): number {
  return index * 40 + 60;
}

function handleSourceFieldMouseDown(field: string, event: MouseEvent) {
  event.preventDefault();
  dragSourceField.value = field;
  
  const index = sourceFields.value.indexOf(field);
  dragLine.value = {
    x1: 150,
    y1: getFieldY(index),
    x2: 150,
    y2: getFieldY(index),
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(event: MouseEvent) {
  if (dragSourceField.value && mappingContainerRef.value) {
    if (!isDragging.value) {
      isDragging.value = true;
    }
    const rect = mappingContainerRef.value.getBoundingClientRect();
    dragLine.value.x2 = event.clientX - rect.left;
    dragLine.value.y2 = event.clientY - rect.top;
  }
}

function handleMouseUp() {
  isDragging.value = false;
  dragSourceField.value = null;
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
}

function handleTargetFieldMouseUp(field: string) {
  if (dragSourceField.value) {
    const newMap = new Map(fieldMapping.value);
    newMap.delete(dragSourceField.value);
    
    for (const [source, target] of newMap.entries()) {
      if (target === field) {
        newMap.delete(source);
        break;
      }
    }
    
    newMap.set(dragSourceField.value, field);
    fieldMapping.value = newMap;
    
    isDragging.value = false;
    dragSourceField.value = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }
}

function handleDeleteMapping(sourceField: string) {
  fieldMapping.value.delete(sourceField);
}

function mapByName() {
  fieldMapping.value.clear();
  let mappedCount = 0;
  sourceFields.value.forEach((sourceField) => {
    const targetField = targetFields.value.find(
      (tf) => tf.toLowerCase() === sourceField.toLowerCase()
    );
    if (targetField) {
      fieldMapping.value.set(sourceField, targetField);
      mappedCount++;
    }
  });
  message.success(`同名映射完成，已映射 ${mappedCount} 个字段`);
}

function mapByRow() {
  fieldMapping.value.clear();
  const minLen = Math.min(sourceFields.value.length, targetFields.value.length);
  for (let i = 0; i < minLen; i++) {
    fieldMapping.value.set(sourceFields.value[i] || '', targetFields.value[i] || '');
  }
  message.success(`同行映射完成，已映射 ${minLen} 个字段`);
}

function clearAllMappings() {
  fieldMapping.value.clear();
  message.success('已清除所有映射');
}

watch(sourceType, () => {
  datasourceId.value = undefined;
  tableName.value = '';
  datasourceOptions.value = [];
  tableOptions.value = [];
  loadDatasourceList();
});

watch(datasourceId, () => {
  if (isInitializing.value) return;
  tableName.value = '';
  tableOptions.value = [];
  sourceFields.value = [];
  fieldMapping.value.clear();
  fieldsLoaded.value = false;
  lastLoadedSource.value = { datasourceId: undefined, tableName: '' };
  if (datasourceId.value) {
    loadTableList();
  }
});

watch(targetSourceType, () => {
  targetDatasourceId.value = undefined;
  targetTableName.value = '';
  targetDatasourceOptions.value = [];
  targetTableOptions.value = [];
  loadTargetDatasourceList();
});

watch(targetDatasourceId, () => {
  if (isInitializing.value) return;
  targetTableName.value = '';
  targetTableOptions.value = [];
  targetFields.value = [];
  fieldMapping.value.clear();
  fieldsLoaded.value = false;
  lastLoadedTarget.value = { datasourceId: undefined, tableName: '' };
  if (targetDatasourceId.value) {
    loadTargetTableList();
  }
});

watch(currentStep, (newVal) => {
  if (newVal === 2) {
    const sourceChanged = lastLoadedSource.value.datasourceId !== datasourceId.value || lastLoadedSource.value.tableName !== tableName.value;
    const targetChanged = lastLoadedTarget.value.datasourceId !== targetDatasourceId.value || lastLoadedTarget.value.tableName !== targetTableName.value;
    
    if (sourceChanged || targetChanged) {
      fieldsLoaded.value = false;
      loadFieldLists();
    } else {
      nextTick(() => {
        updateContainerSize();
      });
    }
  }
});

watch([sourceFields, targetFields], () => {
  if (isInitializing.value) return;
  if (sourceFields.value.length > 0 && targetFields.value.length > 0 && fieldsLoaded.value) {
    fieldMapping.value.clear();
    for (const sourceField of sourceFields.value) {
      if (targetFields.value.includes(sourceField)) {
        fieldMapping.value.set(sourceField, sourceField);
      }
    }
  }
});

function applyAiDraftIfPresent() {
  if (route.query.fromAi !== '1' || isEditMode.value) return;
  const draftStore = useAiTaskDraftStore();
  const draft = draftStore.consumeDraft('streamCDC');
  if (!draft) return;

  if (draft.source?.type) sourceType.value = draft.source.type;
  if (draft.source?.table) tableName.value = draft.source.table;

  if (draft.target?.type) targetSourceType.value = draft.target.type;
  if (draft.target?.table) targetTableName.value = draft.target.table;

  if (draft.name) {
    taskConfig.value = {
      ...taskConfig.value,
      jobName: draft.name,
      description: draft.description ?? taskConfig.value.description,
    };
  }

  message.info('已根据 AI 助手的需求预填关键信息，请补充剩余配置后保存');
}

onMounted(() => {
  window.addEventListener('resize', updateContainerSize);
  loadEnvironmentList();
  applyAiDraftIfPresent();
  nextTick(() => {
    if (isEditMode.value) {
      const projectCode = projectStore.currentProjectCode;
      if (!projectCode) {
        message.error('请先选择项目');
        return;
      }

      pageLoading.value = true;
      getWorkflowStreamCDCData(projectCode, Number(code.value)).then(async (res) => {
        const task:TaskData  = res;
        
        isInitializing.value = true;
        
        sourceType.value = task.source.type;
        await loadDatasourceList();
        datasourceId.value = task.source.datasourceId;
        await loadTableList();
        tableName.value = task.source.tableName;
        
        if (task.source.type === 'MYSQL') {
          mysqlConfig.value = task.source.config as MysqlConfig;
          if (mysqlConfig.value.startupMode === 'timestamp' && mysqlConfig.value.startupTimestamp) {
            startupTimestampPicker.value = dayjs(Number(mysqlConfig.value.startupTimestamp));
          }
        } else if (task.source.type === 'POSTGRESQL') {
          postgresqlConfig.value = task.source.config as PostgresqlConfig;
        }
        
        targetSourceType.value = task.target.type;
        await loadTargetDatasourceList();
        targetDatasourceId.value = task.target.datasourceId;
        await loadTargetTableList();
        targetTableName.value = task.target.tableName;
        
        if (task.target.type === 'MAXCOMPUTE') {
           maxcomputeConfig.value = task.target.config as MaxcomputeConfig;
        } else {
          targetDbConfig.value = task.target.config as TargetDbConfig;
        }

        const savedFieldMapping = new Map(Object.entries(task.fieldMapping));
        
        await loadFieldLists();
        
        fieldMapping.value = savedFieldMapping;
        taskConfig.value = task.taskConfig;
        engineConfig.value = task.engineConfig;
        lastLoadedSource.value = { datasourceId: task.source.datasourceId, tableName: task.source.tableName };
        lastLoadedTarget.value = { datasourceId: task.target.datasourceId, tableName: task.target.tableName };
        
        isInitializing.value = false;
        pageLoading.value = false;
      }).catch(() => {
        pageLoading.value = false;
        message.error('加载数据失败');
      });   
    }
  })
});

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerSize);
  document.removeEventListener('mousemove', handleMouseMove);
  document.removeEventListener('mouseup', handleMouseUp);
});

loadDatasourceList();
loadTargetDatasourceList();

function nextStep() {
  if (currentStep.value === 0) {
    if (!datasourceId.value) {
      message.warning('请选择数据源');
      return;
    }
    if (!tableName.value) {
      message.warning('请选择表名称');
      return;
    }
  }
  
  if (currentStep.value === 1) {
    if (!targetDatasourceId.value) {
      message.warning('请选择目标端数据源');
      return;
    }
    if (!targetTableName.value) {
      message.warning('请选择目标端表名称');
      return;
    }
  }
  
  if (currentStep.value === 2) {
    if (fieldMapping.value.size === 0) {
      message.warning('请至少配置一个字段映射');
      return;
    }
  }
  
  if (currentStep.value < 3) {
    currentStep.value++;
  }
}

function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
}

async function handleConfirm() {
  if (!taskConfig.value.jobName) {
    message.warning('请输入作业名称');
    return;
  }
  
  if (isFlinkEngine.value && !engineConfig.value.yarnQueue) {
    message.warning('请输入Yarn队列');
    return;
  }
  
  if (sourceType.value === 'MYSQL' && mysqlConfig.value.startupMode === 'timestamp') {
    if (!startupTimestampPicker.value) {
      message.warning('请选择时间戳');
      return;
    }
    mysqlConfig.value.startupTimestamp = startupTimestampPicker.value.valueOf();
  }
  
  const mappingObj: Record<string, string> = {};
  fieldMapping.value.forEach((value, key) => {
    mappingObj[key] = value;
  });
  
  taskData.value = {
    source: {
      type: sourceType.value,
      datasourceId: datasourceId.value,
      tableName: tableName.value,
      config: sourceType.value === 'MYSQL' ? mysqlConfig.value : postgresqlConfig.value,
    },
    target: {
      type: targetSourceType.value,
      datasourceId: targetDatasourceId.value,
      tableName: targetTableName.value,
      config: targetSourceType.value === 'MAXCOMPUTE' ? maxcomputeConfig.value : targetDbConfig.value,
    },
    fieldMapping: mappingObj,
    taskConfig: taskConfig.value,
    engineConfig: engineConfig.value,
  };

  const taskDefinitionJson = createTaskDefinition(taskData.value);
  if (isEditMode.value) {
    taskDefinitionJson.code = Number(code.value);
  } else {
    const codeList = await getTaskCodeList();
    taskDefinitionJson.code = codeList[0] || 0;
  }
  
  const taskRelationJson = createTaskRelation(taskDefinitionJson.code);
  const locations = createLocation(taskDefinitionJson.code);
  const executionType = taskConfig.value.execStrategy;
  const description = taskConfig.value.description;

  const globalParams = "[]";
  try {
    if (!isEditMode.value) {
      await verifyWorkflowName(projectStore.currentProjectCode!, taskConfig.value.jobName);

      await createCDCWorkflowDefinition(
        taskData.value.taskConfig.jobName, 
        description, 
        globalParams,
        JSON.stringify([locations]),
        taskConfig.value.timeout,
        JSON.stringify([taskRelationJson]), 
        JSON.stringify([taskDefinitionJson]), 
        executionType, JSON.stringify(taskData.value));
      message.success('任务创建成功！');
    } else {
      await updateCDCWorkflowDefinition(
        taskData.value.taskConfig.jobName, 
        Number(code.value),
        description, 
        globalParams,
        JSON.stringify([locations]),
        taskConfig.value.timeout,
        JSON.stringify([taskRelationJson]), 
        JSON.stringify([taskDefinitionJson]), 
        executionType, JSON.stringify(taskData.value));
      message.success('任务更新成功！');
    }

    const currentPath = route.fullPath;
    await router.push('/collection/taskmanagement');
    closeTabByKey(currentPath);
    
  } catch (error) {
    message.error('任务创建失败！');
  }
}

function createTaskDefinition(taskData: TaskData):TaskDefinition {
  const taskNode: TaskDefinition = {
    code: 0,
    delayTime: taskData.taskConfig.delayTime.toString(),
    name: taskData.taskConfig.jobName, 
    description: taskData.taskConfig.description,
    environmentCode: taskData.taskConfig.environment,
    failRetryInterval: taskData.taskConfig.retryInterval.toString(),
    failRetryTimes: taskData.taskConfig.retryTimes.toString(),
    flag: "YES",
    taskParams: createTaskParam(taskData),
    taskType: 'SEATUNNEL',
    taskPriority: taskData.taskConfig.priority,
    timeout: taskData.taskConfig.timeout,
    timeoutFlag: taskData.taskConfig.timeoutFlag ? 'OPEN' : 'CLOSE',
    timeoutNotifyStrategy: taskData.taskConfig.timeoutAlert ? 'WARNFAILED' : '',
    workerGroup: taskData.taskConfig.workerGroup,
    cpuQuota: taskData.taskConfig.cpuQuota,
    memoryMax: taskData.taskConfig.maxMemory,
    taskExecuteType: 'STREAM',  
  }
 

  return taskNode;
}

function createTaskRelation(code: number): TaskRelation {
  const taskRelation: TaskRelation = {
    name: "",
    preTaskCode: 0,
    preTaskVersion: 0,
    postTaskCode: code,
    postTaskVersion: 0,
    conditionType: 'ALWAYS',
    conditionParams: {},
  };
  return taskRelation;
}

function createLocation(code: number): NodeLocation {
  const location: NodeLocation = {
    taskCode: code,
    x: 400,
    y: 80,
  };
  return location;
}

function createTaskParam(taskData: TaskData): TaskParams {
  const isFlink = taskData.engineConfig.engine !== 'seatunnel.sh';
  let other = '';
  if (isFlink) {
    other = '-t ' + (taskData.engineConfig.deployMode === 'RUN' ? 
                          'yarn-per-job' : 
                          'yarn-application')  + '\\\n';
    if (taskData.engineConfig.yarnQueue) {
      other += ' -Dyarn.application.queue=' + taskData.engineConfig.yarnQueue + '\\\n';
    }
    if (taskData.engineConfig.jobmanagerMemory) {
      other += ' -Djobmanager.memory.process.size=' + taskData.engineConfig.jobmanagerMemory + 'GB' + '\\\n';
    }
    if (taskData.engineConfig.taskmanagerMemory) {
      other += ' -Dtaskmanager.memory.process.size=' + taskData.engineConfig.taskmanagerMemory + 'GB' + '\\\n';
    }
    if (taskData.engineConfig.checkpointAddress) {
      other += ' -Dstate.checkpoints.dir=' + taskData.engineConfig.checkpointAddress + '\\\n';
    }
    if (other.endsWith('\\\\n')) {
      other = other.slice(0, -3);
    }
  }
  

  const taskParams: TaskParams = {
    localParams: [],
    rawScript: createScript(taskData),
    resourceList: [],
    startupScript: taskData.engineConfig.engine,
    useCustom: true,
    runMode: (()=>{
      if (taskData.engineConfig.engine !== 'seatunnel.sh') {
        return taskData.engineConfig.deployMode;
      } else {
        return '';
      }
    })(),
    deployMode: (()=>{
      if (taskData.engineConfig.engine === 'seatunnel.sh') {
        return taskData.engineConfig.deployMode;
      } else {
        return '';
      }
    })(),
    others: other,
  };
  return taskParams;
}

function createScript(taskData: TaskData): string {
  const env = createEnv(taskData);
  const source = createSource(taskData);
  const target = createTarget(taskData);
  const transform = createTransfrom(taskData);

  return env + "\n" + source + "\n" + transform + "\n" + target;
}

function createEnv(taskData: TaskData): string {
  const isFlink = taskData.engineConfig.engine !== 'seatunnel.sh';

  const envConfig: JobEnvConfig = {
    "job.name": taskData.taskConfig.jobName,
    "job.mode": "STREAMING",
    "checkpoint.interval": taskData.engineConfig.checkpointInterval,
    "checkpoint.timeout": taskData.engineConfig.checkpointTimeout,
    "execution.parallelism": taskData.engineConfig.parallelism,
  };

  if (isFlink) {
    envConfig["execution.engine"] = 'flink';
  }

  const result = `env {\n  ${toHoconString(envConfig)}\n}`;

  return result;
}

function createSource(taskData: TaskData): string {
  const connectionParams = JSON.parse(srcConnectionParams.value);
  let result = '';
  const source: CDCSource = {
    "url": connectionParams.jdbcUrl,
    "username": connectionParams.user,
    "password": connectionParams.password,
    "table-names": [connectionParams.database + "." + taskData.source.tableName],
    "connect.timeout.ms": 0,
    "connect.max-retries": 0,
    "connection.pool.size": 0,
    "plugin_output": "",
    "startup.mode": "",
    "stop.mode": "",
  };

  
  switch (taskData.source.type) {
    case 'MYSQL':
      const config = taskData.source.config as MysqlConfig;
      source["startup.mode"] = config.startupMode;
      source["plugin_output"] = taskData.source.tableName;
      if (config.startupMode === 'specific') {
        source["startup.specific-offset.file"] = config.binlogName;
        source["startup.specific-offset.pos"] = config.binlogPosition;
      }
      if (config.startupMode === 'timestamp') {
        source["startup.timestamp"] = config.startupTimestamp;
      }
      source["stop.mode"] = config.stopMode;
      if (config.stopMode === 'specific') {
        source["stop.specific-offset.file"] = config.stopBinlogName;
        source["stop.specific-offset.pos"] = config.stopBinlogPosition;
      }
      source["connect.timeout.ms"] = config.timeout;
      source["connect.max-retries"] = config.retryTimes;
      source["connection.pool.size"] = config.connectionPool;
      result = `MySQL-CDC {\n  ${toHoconString(source)}\n}`;
      break;
    case 'POSTGRES':
      const pgConfig = taskData.source.config as PostgresqlConfig;
      source["startup.mode"] = pgConfig.startupMode;
      source["connect.timeout.ms"] = pgConfig.timeout;
      source["connect.max-retries"] = pgConfig.retryTimes;
      source["connection.pool.size"] = pgConfig.connectionPool;
      result = `Postgres-CDC {\n  ${toHoconString(source)}\n}`;
      break;
  }
  result = "source {\n" + result + "\n}";

  return result;
}

function createTarget(taskData: TaskData): string {
  const connectionParams = JSON.parse(targetConnectionParams.value);
  let result = "";
  const pluginInput = taskData.source.tableName + "_" + taskData.target.tableName;
  const prefix = "jdbc:odps:";
  const endpoint = connectionParams.jdbcUrl.substring(prefix.length).split("?")[0];
  if (taskData.target.type === 'MAXCOMPUTE') {
    const config = taskData.target.config as MaxcomputeConfig;
    const target : MaxComputeSource = {
      "accessId": connectionParams.accessId,
      "accesskey": connectionParams.accessKey,
      "endpoint": endpoint,
      "project": connectionParams.database,
      "table_name": taskData.target.tableName,
      "schema_save_mode": config.schemaMode,
      "data_save_mode": config.dataMode,
      "overwrite": config.overwriteData,
      "plugin_input": pluginInput,
    }
    if (connectionParams.tunnelEndpoint) {
      target["tunnel_endpoint"] = connectionParams.tunnelEndpoint;
    }
    result = `Maxcompute  {\n  ${toHoconString(target)}\n}`;
  } else {
    const cdConfig = taskData.target.config as TargetDbConfig;
    const target: CommonSource = {
      "url": connectionParams.jdbcUrl,
      "driver": connectionParams.driverClassName,
      "user": connectionParams.user,
      "password": connectionParams.password,
      "table": taskData.target.tableName,
      "max_retries": cdConfig.retry,
      "batch_size": cdConfig.cacheRows,
      "max_commit_attempts": cdConfig.transactionRetry,
      "plugin_input": pluginInput,
      "generate_sink_sql": true,
      "database": connectionParams.database,
    };
    result = `jdbc {\n  ${toHoconString(target)}\n}`;
  }
  result = "sink {\n" + result + "\n}";

  return result;
}

function createTransfrom(taskData: TaskData): string {
  let result = "transform {\n";
  result += "  FieldMapper {\n";
  result += "plugin_input = [\"" + taskData.source.tableName + "\"]\n";
  result += "plugin_output = \"" + taskData.source.tableName + "_" + taskData.target.tableName + "\"\n";
  result += "field_mapper = {\n";
  for (const [sourceField, targetField] of Object.entries(taskData.fieldMapping)) {
    result += sourceField + " = " + targetField + "\n";
  }
  result += "}\n";
  result += "  }\n";
  result += "}\n";

  return result;
}

function toHoconString(obj: any): string {
  return Object.entries(obj).map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key} = [${value.map(v => `"${v}"`).join(', ')}]`;
      }
      
      if (typeof value === 'number') {
        return `${key} = ${value}`;
      }
      
      if (typeof value === 'boolean') {
        return `${key} = ${value}`;
      }

      return `${key} = "${value}"`;
    })
    .join('\n  ');
}


function handleCancel() {
  currentStep.value = 0;
  sourceType.value = 'MYSQL';
  datasourceId.value = undefined;
  tableName.value = '';
  startupTimestampPicker.value = undefined;
  mysqlConfig.value = {
    startupMode: 'initial',
    binlogName: '',
    binlogPosition: undefined,
    startupTimestamp: undefined,
    stopMode: 'never',
    stopBinlogName: '',
    stopBinlogPosition: undefined,
    timeout: 3000,
    retryTimes: 3,
    connectionPool: 20,
  };
  postgresqlConfig.value = {
    startupMode: 'initial',
    decodePlugin: 'pgoutput',
    timeout: 3000,
    retryTimes: 3,
    connectionPool: 20,
  };
  targetSourceType.value = 'MYSQL';
  targetDatasourceId.value = undefined;
  targetTableName.value = '';
  targetDbConfig.value = {
    schemaMode: 'CREATE_SCHEMA_WHEN_NOT_EXIST',
    dataMode: 'APPEND_DATA',
    customSql: '',
    retry: 0,
    cacheRows: 1000,
    transactionRetry: 3,
  };
  maxcomputeConfig.value = {
    overwriteData: false,
    schemaMode: 'CREATE_SCHEMA_WHEN_NOT_EXIST',
    dataMode: 'APPEND_DATA',
    customSql: '',
  };
  sourceFields.value = [];
  targetFields.value = [];
  fieldMapping.value.clear();
  fieldsLoaded.value = false;
  lastLoadedSource.value = { datasourceId: undefined, tableName: '' };
  lastLoadedTarget.value = { datasourceId: undefined, tableName: '' };
  taskConfig.value = {
    jobName: '',
    description: '',
    priority: 'MEDIUM',
    workerGroup: 'default',
    environment: 0,
    retryTimes: 0,
    retryInterval: 1,
    cpuQuota: -1,
    maxMemory: -1,
    delayTime: 0,
    timeoutFlag: false,
    timeoutAlert: false,
    timeoutStrategy: [],
    timeout: 0,
    execStrategy: 'PARALLEL',
  };
  engineConfig.value = {
    engine: 'seatunnel.sh',
    deployMode: 'local',
    parallelism: 4,
    checkpointInterval: 30000,
    checkpointTimeout: 30000,
    checkpointAddress: '',
    taskmanagerMemory: 1,
    jobmanagerMemory: 1,
    yarnQueue: '',
  };
  taskData.value = {
    source: {
      type: 'MYSQL',
      datasourceId: undefined,
      tableName: '',
      config: {
        startupMode: 'initial',
        binlogName: '',
        binlogPosition: undefined,
        startupTimestamp: undefined,
        stopMode: 'never',
        stopBinlogName: '',
        stopBinlogPosition: undefined,
        timeout: 3000,
        retryTimes: 3,
        connectionPool: 20,
      },
    },
    target: {
      type: 'MYSQL',
      datasourceId: undefined,
      tableName: '',
      config: {
        schemaMode: 'CREATE_SCHEMA_WHEN_NOT_EXIST',
        dataMode: 'APPEND_DATA',
        customSql: '',
        retry: 0,
        cacheRows: 1000,
        transactionRetry: 3,
      },
    },
    fieldMapping: {},
    taskConfig: {
      jobName: '',
      description: '',
      priority: 'MEDIUM',
      workerGroup: 'default',
      environment: 0,
      retryTimes: 0,
      retryInterval: 1,
      cpuQuota: -1,
      maxMemory: -1,
      delayTime: 0,
      timeoutFlag: false,
      timeoutAlert: false,
      timeoutStrategy: [],
      timeout: 0,
      execStrategy: 'PARALLEL',
    },
    engineConfig: {
      engine: 'seatunnel.sh',
      deployMode: 'local',
      parallelism: 4,
      checkpointInterval: 30000,
      checkpointTimeout: 30000,
      checkpointAddress: '',
      taskmanagerMemory: 1,
      jobmanagerMemory: 1,
      yarnQueue: '',
    },
  };
  message.info('已取消创建');
}

const showMysqlBinlogFields = computed(() => mysqlConfig.value.startupMode === 'specific');
const showMysqlTimestampField = computed(() => mysqlConfig.value.startupMode === 'timestamp');
const showMysqlStopBinlogFields = computed(() => mysqlConfig.value.stopMode === 'specific');
const showTargetCustomSql = computed(() => targetDbConfig.value.dataMode === 'CUSTOM_PROCESSING');
const showMaxcomputeCustomSql = computed(() => maxcomputeConfig.value.dataMode === 'CUSTOM_PROCESSING');
const isMaxcomputeTarget = computed(() => targetSourceType.value === 'MAXCOMPUTE');
const isFlinkEngine = computed(() => engineConfig.value.engine !== 'seatunnel.sh');

const deployModeOptions = computed(() => {
  if (engineConfig.value.engine === 'seatunnel.sh') {
    return [
      { label: '集群', value: 'cluster' },
      { label: '本地', value: 'local' },
    ];
  } else {
    return [
      { label: 'yarn-per-job', value: 'RUN' },
    ];
  }
});

watch(() => engineConfig.value.engine, () => {
  if (engineConfig.value.engine === 'seatunnel.sh') {
    engineConfig.value.deployMode = 'local';
  } else {
    engineConfig.value.deployMode = 'RUN';
  }
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="pageLoading" tip="加载中...">
      <div class="cdc-container">
        <Card class="steps-card" >
        <div class="steps-section">
          <Steps :current="currentStep" size="small">
            <Step title="选择源端" description="配置源端数据源" />
            <Step title="选择目标端" description="配置目标端数据源" />
            <Step title="字段映射" description="配置字段映射关系" />
            <Step title="运行配置" description="配置任务运行参数" />
          </Steps>
        </div>

        <div class="step-content-section">
          <div v-show="currentStep === 0" class="step-content">
            <h3 class="step-title">{{ t('datacollection.cdc.selectSource') }}</h3>
            <Form layout="inline" class="grid-form">
              <Row :gutter="16" class="w-full">
                <Col :span="8">
                  <Form.Item :label="t('datacollection.cdc.sourceType')" required class="form-item">
                    <Select
                      v-model:value="sourceType"
                      :options="sourceTypeOptions"
                      :placeholder="t('datacollection.cdc.selectSourceType')"
                    />
                  </Form.Item>
                </Col>
                <Col :span="8">
                  <Form.Item :label="t('datacollection.cdc.datasourceList')" required class="form-item">
                    <Select
                      v-model:value="datasourceId"
                      :options="datasourceOptions"
                      :placeholder="t('datacollection.cdc.selectDatasource')"
                      :loading="sourceDatasourceLoading"
                      show-search
                    />
                  </Form.Item>
                </Col>
                <Col :span="8">
                  <Form.Item :label="t('datacollection.cdc.tableName')" required class="form-item">
                    <AutoComplete
                      v-model:value="tableName"
                      :options="tableOptions"
                      :placeholder="t('datacollection.cdc.selectOrInputTable')"
                      class="full-width-input"
                    >
                      <template #notFoundContent>
                        <Spin v-if="sourceTableLoading" size="small" />
                      </template>
                    </AutoComplete>
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">{{ t('datacollection.cdc.sourceConfig') }}</Divider>

              <template v-if="sourceType === 'MYSQL'">
                <Row :gutter="16" class="w-full">
                  <Col :span="8">
                    <Form.Item :label="t('datacollection.cdc.startupMode')" class="form-item">
                      <Select
                        v-model:value="mysqlConfig.startupMode"
                        :options="startupModeOptions"
                        :placeholder="t('datacollection.cdc.selectStartupMode')"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="8">
                    <Form.Item v-if="showMysqlBinlogFields" :label="t('datacollection.cdc.binlogName')" class="form-item">
                      <Input
                        v-model:value="mysqlConfig.binlogName"
                        :placeholder="t('datacollection.cdc.inputBinlogName')"
                      />
                    </Form.Item>
                    <Form.Item v-if="showMysqlTimestampField" :label="t('datacollection.cdc.timestamp')" class="form-item">
                      <DatePicker
                        v-model:value="startupTimestampPicker"
                        show-time
                        format="YYYY-MM-DD HH:mm:ss"
                        :placeholder="t('datacollection.cdc.inputTimestamp')"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="8">
                    <Form.Item v-if="showMysqlBinlogFields" :label="t('datacollection.cdc.binlogOffset')" class="form-item">
                      <InputNumber
                        v-model:value="mysqlConfig.binlogPosition"
                        :min="0"
                        :placeholder="t('datacollection.cdc.inputBinlogOffset')"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row :gutter="16" class="w-full">
                  <Col :span="8">
                    <Form.Item :label="t('datacollection.cdc.stopMode')" class="form-item">
                      <Select
                        v-model:value="mysqlConfig.stopMode"
                        :options="stopModeOptions"
                        :placeholder="t('datacollection.cdc.selectStopMode')"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="8">
                    <Form.Item v-if="showMysqlStopBinlogFields" :label="t('datacollection.cdc.binlogName')" class="form-item">
                      <Input
                        v-model:value="mysqlConfig.stopBinlogName"
                        :placeholder="t('datacollection.cdc.inputBinlogName')"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="8">
                    <Form.Item v-if="showMysqlStopBinlogFields" :label="t('datacollection.cdc.binlogOffset')" class="form-item">
                      <InputNumber
                        v-model:value="mysqlConfig.stopBinlogPosition"
                        :min="0"
                        :placeholder="t('datacollection.cdc.inputBinlogOffset')"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row :gutter="16" class="w-full">
                  <Col :span="8">
                    <Form.Item :label="t('datacollection.cdc.timeout')" class="form-item">
                      <InputNumber
                        v-model:value="mysqlConfig.timeout"
                        :min="0"
                        :placeholder="t('datacollection.cdc.timeout')"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="8">
                    <Form.Item :label="t('datacollection.cdc.retryTimes')" class="form-item">
                      <InputNumber
                        v-model:value="mysqlConfig.retryTimes"
                        :min="0"
                        :placeholder="t('datacollection.cdc.retryTimes')"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="8">
                    <Form.Item :label="t('datacollection.cdc.connectionPool')" class="form-item">
                      <InputNumber
                        v-model:value="mysqlConfig.connectionPool"
                        :min="1"
                        :placeholder="t('datacollection.cdc.connectionPool')"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </template>

              <template v-if="sourceType === 'POSTGRESQL'">
                <Row :gutter="16" class="w-full">
                  <Col :span="12">
                    <Form.Item :label="t('datacollection.cdc.startupMode')" class="form-item">
                      <Select
                        v-model:value="postgresqlConfig.startupMode"
                        :options="postgresqlStartupModeOptions"
                        :placeholder="t('datacollection.cdc.selectStartupMode')"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="12">
                    <Form.Item :label="t('datacollection.cdc.decodePlugin')" class="form-item">
                      <Select
                        v-model:value="postgresqlConfig.decodePlugin"
                        :options="decodePluginOptions"
                        :placeholder="t('datacollection.cdc.selectDecodePlugin')"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row :gutter="16" class="w-full">
                  <Col :span="8">
                    <Form.Item :label="t('datacollection.cdc.timeout')" class="form-item">
                      <InputNumber
                        v-model:value="postgresqlConfig.timeout"
                        :min="0"
                        :placeholder="t('datacollection.cdc.timeout')"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="8">
                    <Form.Item :label="t('datacollection.cdc.retryTimes')" class="form-item">
                      <InputNumber
                        v-model:value="postgresqlConfig.retryTimes"
                        :min="0"
                        :placeholder="t('datacollection.cdc.retryTimes')"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="8">
                    <Form.Item :label="t('datacollection.cdc.connectionPool')" class="form-item">
                      <InputNumber
                        v-model:value="postgresqlConfig.connectionPool"
                        :min="1"
                        :placeholder="t('datacollection.cdc.connectionPool')"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </template>
            </Form>
          </div>

          <div v-show="currentStep === 1" class="step-content">
            <h3 class="step-title">{{ t('datacollection.cdc.selectTarget') }}</h3>
            <Form layout="inline" class="grid-form">
              <Row :gutter="16" class="w-full">
                <Col :span="8">
                  <Form.Item :label="t('datacollection.cdc.sourceType')" required class="form-item">
                    <Select
                      v-model:value="targetSourceType"
                      :options="targetSourceTypeOptions"
                      :placeholder="t('datacollection.cdc.selectSourceType')"
                    />
                  </Form.Item>
                </Col>
                <Col :span="8">
                  <Form.Item :label="t('datacollection.cdc.datasourceList')" required class="form-item">
                    <Select
                      v-model:value="targetDatasourceId"
                      :options="targetDatasourceOptions"
                      :placeholder="t('datacollection.cdc.selectDatasource')"
                      :loading="targetDatasourceLoading"
                      show-search
                    />
                  </Form.Item>
                </Col>
                <Col :span="8">
                  <Form.Item :label="t('datacollection.cdc.tableName')" required class="form-item">
                    <AutoComplete
                      v-model:value="targetTableName"
                      :options="targetTableOptions"
                      :placeholder="t('datacollection.cdc.selectOrInputTable')"
                      class="full-width-input"
                    >
                      <template #notFoundContent>
                        <Spin v-if="targetTableLoading" size="small" />
                      </template>
                    </AutoComplete>
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">{{ t('datacollection.cdc.targetConfig') }}</Divider>

              <template v-if="!isMaxcomputeTarget">
                <Row :gutter="16" class="w-full">
                  <Col :span="12">
                    <Form.Item :label="t('datacollection.cdc.schemaMode')" class="form-item">
                      <Select
                        v-model:value="targetDbConfig.schemaMode"
                        :options="schemaModeOptions"
                        :placeholder="t('datacollection.cdc.selectSchemaMode')"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="12">
                    <Form.Item :label="t('datacollection.cdc.dataMode')" class="form-item">
                      <Select
                        v-model:value="targetDbConfig.dataMode"
                        :options="dataModeOptions"
                        :placeholder="t('datacollection.cdc.selectDataMode')"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row v-if="showTargetCustomSql" :gutter="16" class="w-full">
                  <Col :span="24">
                    <Form.Item :label="t('datacollection.cdc.customSql')" class="form-item">
                      <Input.TextArea
                        v-model:value="targetDbConfig.customSql"
                        :placeholder="t('datacollection.cdc.inputCustomSql')"
                        :rows="3"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row :gutter="16" class="w-full">
                  <Col :span="8">
                    <Form.Item :label="t('datacollection.cdc.retry')" class="form-item">
                      <InputNumber
                        v-model:value="targetDbConfig.retry"
                        :min="0"
                        :placeholder="t('datacollection.cdc.retry')"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="8">
                    <Form.Item :label="t('datacollection.cdc.cacheRows')" class="form-item">
                      <InputNumber
                        v-model:value="targetDbConfig.cacheRows"
                        :min="1"
                        :placeholder="t('datacollection.cdc.cacheRows')"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="8">
                    <Form.Item :label="t('datacollection.cdc.transactionRetry')" class="form-item">
                      <InputNumber
                        v-model:value="targetDbConfig.transactionRetry"
                        :min="0"
                        :placeholder="t('datacollection.cdc.transactionRetry')"
                        style="width: 100%"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </template>

              <template v-if="isMaxcomputeTarget">
                <Row :gutter="16" class="w-full">
                  <Col :span="12">
                    <Form.Item :label="t('datacollection.cdc.overwriteData')" class="form-item">
                      <Switch
                        v-model:checked="maxcomputeConfig.overwriteData"
                        :checked-children="t('datacollection.cdc.yes')"
                        :un-checked-children="t('datacollection.cdc.no')"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row :gutter="16" class="w-full">
                  <Col :span="12">
                    <Form.Item :label="t('datacollection.cdc.schemaMode')" class="form-item">
                      <Select
                        v-model:value="maxcomputeConfig.schemaMode"
                        :options="schemaModeOptions"
                        :placeholder="t('datacollection.cdc.selectSchemaMode')"
                      />
                    </Form.Item>
                  </Col>
                  <Col :span="12">
                    <Form.Item :label="t('datacollection.cdc.dataMode')" class="form-item">
                      <Select
                        v-model:value="maxcomputeConfig.dataMode"
                        :options="dataModeOptions"
                        :placeholder="t('datacollection.cdc.selectDataMode')"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row v-if="showMaxcomputeCustomSql" :gutter="16" class="w-full">
                  <Col :span="24">
                    <Form.Item :label="t('datacollection.cdc.customSql')" class="form-item">
                      <Input.TextArea
                        v-model:value="maxcomputeConfig.customSql"
                        :placeholder="t('datacollection.cdc.inputCustomSql')"
                        :rows="3"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </template>
            </Form>
          </div>

          <div v-show="currentStep === 2" class="step-content">
            <h3 class="step-title">{{ t('datacollection.cdc.fieldMapping') }}</h3>
            <div class="mapping-toolbar">
              <Button type="primary" size="small" @click="mapByName">
                {{ t('datacollection.cdc.mapByName') }}
              </Button>
              <Button size="small" @click="mapByRow" class="ml-2">
                {{ t('datacollection.cdc.mapByRow') }}
              </Button>
              <Button size="small" @click="clearAllMappings" class="ml-2">
                {{ t('datacollection.cdc.clearMapping') }}
              </Button>
            </div>
            <Spin :spinning="loadingFields">
              <div ref="mappingContainerRef" class="mapping-container">
                <svg
                  :width="containerWidth"
                  :height="containerHeight"
                  class="mapping-svg"
                >
                  <defs>
                    <marker
                      id="arrowhead"
                      markerWidth="10"
                      markerHeight="7"
                      refX="9"
                      refY="3.5"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3.5, 0 7" fill="#1890ff" />
                    </marker>
                  </defs>
                  
                  <template v-for="[source, target] in mappingEntries" :key="source">
                    <line
                      :x1="150"
                      :y1="getFieldY(sourceFields.indexOf(source))"
                      :x2="containerWidth - 150"
                      :y2="getFieldY(targetFields.indexOf(target))"
                      stroke="#1890ff"
                      stroke-width="2"
                      marker-end="url(#arrowhead)"
                      class="mapping-line"
                      @click="handleDeleteMapping(source)"
                    />
                  </template>
                  
                  <line
                    v-if="isDragging"
                    :x1="dragLine.x1"
                    :y1="dragLine.y1"
                    :x2="dragLine.x2"
                    :y2="dragLine.y2"
                    stroke="#1890ff"
                    stroke-width="2"
                    class="mapping-line drag-line"
                  />
                </svg>
                
                <div class="source-fields">
                  <div class="field-list-header">{{ t('datacollection.cdc.sourceFields') }} ({{ tableName }})</div>
                  <div
                    v-for="(field, index) in sourceFields"
                    :key="field"
                    class="field-item"
                    :class="{
                      'field-mapped': mappedSourceFields.has(field),
                      'field-dragging': dragSourceField === field,
                    }"
                    :style="{ top: `${getFieldY(index) - 15}px` }"
                    @mousedown="handleSourceFieldMouseDown(field, $event)"
                  >
                    {{ field }}
                  </div>
                </div>
                
                <div class="target-fields">
                  <div class="field-list-header">{{ t('datacollection.cdc.targetFields') }} ({{ targetTableName }})</div>
                  <div
                    v-for="(field, index) in targetFields"
                    :key="field"
                    class="field-item"
                    :class="{
                      'field-mapped': mappedTargetFields.has(field),
                    }"
                    :style="{ top: `${getFieldY(index) - 15}px` }"
                    @mouseup="handleTargetFieldMouseUp(field)"
                  >
                    {{ field }}
                  </div>
                </div>
              </div>
            </Spin>
            
            <div class="mapping-info">
              <p>{{ t('datacollection.cdc.mappedFields') }}: {{ mappingCount }} / {{ sourceFields.length }}</p>
              <p class="mapping-tip">{{ t('datacollection.cdc.mappingTip') }}</p>
            </div>
          </div>

          <div v-show="currentStep === 3" class="step-content">
            <h3 class="step-title">{{ t('datacollection.cdc.taskConfig') }}</h3>
            <Form layout="inline" class="grid-form">
              <Row :gutter="16" class="w-full">
                <Col :span="24">
                  <Form.Item :label="t('datacollection.cdc.jobName')" required class="form-item">
                    <Input
                      v-model:value="taskConfig.jobName"
                      :placeholder="t('datacollection.cdc.inputJobName')"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row :gutter="16" class="w-full">
                <Col :span="24">
                  <Form.Item :label="t('datacollection.cdc.description')" class="form-item">
                    <Input.TextArea
                      v-model:value="taskConfig.description"
                      :placeholder="t('datacollection.cdc.inputDescription')"
                      :rows="3"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row :gutter="16" class="w-full">
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.priority')" class="form-item">
                    <Select
                      v-model:value="taskConfig.priority"
                      :options="priorityOptions"
                      :placeholder="t('datacollection.cdc.selectPriority')"
                    />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.workerGroup')" class="form-item">
                    <Select
                      v-model:value="taskConfig.workerGroup"
                      :options="workerGroupOptions"
                      :placeholder="t('datacollection.cdc.selectWorkerGroup')"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row :gutter="16" class="w-full">
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.environment')" class="form-item">
                    <Select
                      v-model:value="taskConfig.environment"
                      :options="environmentOptions"
                      :placeholder="t('datacollection.cdc.selectEnvironment')"
                    />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.retryTimesTask')" class="form-item">
                    <InputNumber
                      v-model:value="taskConfig.retryTimes"
                      :min="0"
                      :placeholder="t('datacollection.cdc.retryTimesTask')"
                      style="width: 100%"
                      addon-after="次"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row :gutter="16" class="w-full">
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.retryInterval')" class="form-item">
                    <InputNumber
                      v-model:value="taskConfig.retryInterval"
                      :min="1"
                      :placeholder="t('datacollection.cdc.retryInterval')"
                      style="width: 100%"
                      addon-after="分"
                    />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.cpuQuota')" class="form-item">
                    <InputNumber
                      v-model:value="taskConfig.cpuQuota"
                      :placeholder="t('datacollection.cdc.cpuQuota')"
                      style="width: 100%"
                      addon-after="%"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row :gutter="16" class="w-full">
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.maxMemory')" class="form-item">
                    <InputNumber
                      v-model:value="taskConfig.maxMemory"
                      :placeholder="t('datacollection.cdc.maxMemory')"
                      style="width: 100%"
                      addon-after="MB"
                    />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.delayTime')" class="form-item">
                    <InputNumber
                      v-model:value="taskConfig.delayTime"
                      :min="0"
                      :placeholder="t('datacollection.cdc.delayTime')"
                      style="width: 100%"
                      addon-after="分"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row :gutter="16" class="w-full">
                <Col :span="24">
                  <Form.Item :label="t('datacollection.cdc.timeoutFlag')" class="form-item">
                    <div class="flex items-center gap-4">
                      <Switch v-model:checked="taskConfig.timeoutFlag" />
                      <template v-if="taskConfig.timeoutFlag">
                        <Checkbox.Group v-model:value="taskConfig.timeoutStrategy">
                          <Checkbox value="ALERT">{{ t('datacollection.cdc.timeoutAlert') }}</Checkbox>
                          <Checkbox value="FAIL">{{ t('datacollection.cdc.timeoutFail') }}</Checkbox>
                        </Checkbox.Group>
                        <InputNumber
                          v-model:value="taskConfig.timeout"
                          :min="1"
                          :placeholder="t('datacollection.cdc.timeoutDuration')"
                          style="width: 150px"
                          addon-after="分"
                        />
                      </template>
                    </div>
                  </Form.Item>
                </Col>
              </Row>

              <Row :gutter="16" class="w-full">
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.execStrategy')" class="form-item">
                    <Select
                      v-model:value="taskConfig.execStrategy"
                      :options="execStrategyOptions"
                      :placeholder="t('datacollection.cdc.selectExecStrategy')"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left">{{ t('datacollection.cdc.engineConfig') }}</Divider>

              <Row :gutter="16" class="w-full">
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.computeEngine')" class="form-item">
                    <Select
                      v-model:value="engineConfig.engine"
                      :options="engineOptions"
                      :placeholder="t('datacollection.cdc.selectEngine')"
                    />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.deployMode')" class="form-item">
                    <Radio.Group v-model:value="engineConfig.deployMode">
                      <Radio
                        v-for="option in deployModeOptions"
                        :key="option.value"
                        :value="option.value"
                      >
                        {{ option.label }}
                      </Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
              </Row>

              <Row v-if="isFlinkEngine" :gutter="16" class="w-full">
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.yarnQueue')" required class="form-item">
                    <Input
                      v-model:value="engineConfig.yarnQueue"
                      :placeholder="t('datacollection.cdc.inputYarnQueue')"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row :gutter="16" class="w-full">
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.parallelism')" class="form-item">
                    <InputNumber
                      v-model:value="engineConfig.parallelism"
                      :min="1"
                      :placeholder="t('datacollection.cdc.parallelism')"
                      style="width: 100%"
                    />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.checkpointInterval')" class="form-item">
                    <InputNumber
                      v-model:value="engineConfig.checkpointInterval"
                      :min="0"
                      :placeholder="t('datacollection.cdc.checkpointInterval')"
                      style="width: 100%"
                      addon-after="ms"
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row :gutter="16" class="w-full">
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.checkpointTimeout')" class="form-item">
                    <InputNumber
                      v-model:value="engineConfig.checkpointTimeout"
                      :min="0"
                      :placeholder="t('datacollection.cdc.checkpointTimeout')"
                      style="width: 100%"
                      addon-after="ms"
                    />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.checkpointAddress')" class="form-item">
                    <Input
                      v-model:value="engineConfig.checkpointAddress"
                      :placeholder="t('datacollection.cdc.inputCheckpointAddress')"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row v-if="isFlinkEngine" :gutter="16" class="w-full">
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.taskmanagerMemory')" class="form-item">
                    <InputNumber
                      v-model:value="engineConfig.taskmanagerMemory"
                      :min="1"
                      :placeholder="t('datacollection.cdc.taskmanagerMemory')"
                      style="width: 100%"
                      addon-after="GB"
                    />
                  </Form.Item>
                </Col>
                <Col :span="12">
                  <Form.Item :label="t('datacollection.cdc.jobmanagerMemory')" class="form-item">
                    <InputNumber
                      v-model:value="engineConfig.jobmanagerMemory"
                      :min="1"
                      :placeholder="t('datacollection.cdc.jobmanagerMemory')"
                      style="width: 100%"
                      addon-after="GB"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </div>
        </div>
        <div class="step-actions">
          <Space>
            <Button v-if="currentStep > 0" @click="prevStep">
              {{ t('datacollection.cdc.prevStep') }}
            </Button>
            <Button v-if="currentStep < 3" type="primary" @click="nextStep">
              {{ t('datacollection.cdc.nextStep') }}
            </Button>
            <Button v-if="currentStep === 3" type="primary" @click="handleConfirm">
              {{ isEditMode ? t('datacollection.cdc.confirmUpdate') : t('datacollection.cdc.confirmCreate') }}
            </Button>
            <Button @click="handleCancel">
              {{ t('datacollection.cdc.cancel') }}
            </Button>
          </Space>
        </div>
      </Card>
    </div>
    </Spin>
  </Page>
</template>

<style scoped>
.cdc-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.steps-card {
  flex-shrink: 0;
}

.steps-section {
  flex-shrink: 0;
  padding: 12px 0;
}

.step-content-section {
  flex: 1;
  overflow: auto;
  padding: 8px 0;
}

.content-card {
  flex: 1;
  overflow: auto;
}

.step-content {
  padding: 16px 0;
}

.step-title {
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  gap: 8px;
}

.grid-form {
  width: 100%;
}

.grid-form .w-full {
  width: 100%;
  margin-bottom: 8px;
}

.grid-form .form-item {
  margin-bottom: 8px;
  width: 100%;
  display: flex;
  align-items: center;
}

.grid-form .form-item :deep(.ant-form-item-label) {
  flex: 0 0 auto;
  padding-right: 12px;
  text-align: right;
  min-width: 120px;
}

.grid-form .form-item :deep(.ant-form-item-control) {
  flex: 1 1 auto;
  min-width: 0;
}

.grid-form .form-item :deep(.ant-select) {
  width: 100% !important;
  min-width: 150px !important;
}

.grid-form .form-item :deep(.ant-input),
.grid-form .form-item :deep(.ant-input-number),
.grid-form .form-item :deep(.ant-auto-complete) {
  width: 100%;
  min-width: 150px;
}

.grid-form .form-item :deep(.ant-select-selector),
.grid-form .form-item :deep(.ant-input),
.grid-form .form-item :deep(.ant-input-number) {
  width: 100% !important;
  min-width: 150px !important;
}

.grid-form .form-item .full-width-input {
  width: 100%;
  min-width: 150px;
}

.grid-form .form-item .full-width-input :deep(.ant-input) {
  width: 100% !important;
  min-width: 150px !important;
}

.inline-form {
  width: 100%;
}

.inline-form .full-width {
  width: 100%;
  margin-bottom: 8px;
}

.inline-form .ant-form-item {
  margin-bottom: 8px;
  width: 100%;
}

.inline-form .ant-form-item-label {
  flex: 0 0 auto;
  padding-right: 8px;
}

.inline-form .ant-form-item-control {
  flex: 1 1 auto;
  min-width: 0;
}

.mapping-placeholder {
  margin-top: 16px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  text-align: center;
  color: #666;
}

.mapping-toolbar {
  margin-bottom: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.mapping-container {
  position: relative;
  width: 100%;
  min-height: 400px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fafafa;
  overflow: auto;
}

.mapping-svg {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.mapping-line {
  pointer-events: auto;
  cursor: pointer;
  transition: stroke 0.3s;
}

.mapping-line:hover {
  stroke: #ff4d4f;
  stroke-width: 3;
}

.source-fields,
.target-fields {
  position: absolute;
  top: 0;
  width: 150px;
  z-index: 2;
}

.source-fields {
  left: 0;
}

.target-fields {
  right: 0;
}

.field-list-header {
  padding: 8px 12px;
  background: #e6f7ff;
  border-bottom: 1px solid #91d5ff;
  font-weight: 600;
  font-size: 12px;
  color: #0050b3;
}

.field-item {
  position: absolute;
  left: 12px;
  right: 12px;
  padding: 4px 8px;
  background: #fff;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: auto;
  user-select: none;
}

.field-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.field-dragging {
  background: rgba(24, 144, 255, 0.2);
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
}

.field-mapped {
  background: #f6ffed;
  border-color: #b7eb8f;
}

.drag-line {
  stroke-dasharray: 5, 5;
  pointer-events: none;
}

.mapping-info {
  margin-top: 16px;
  padding: 12px;
  background: #f0f2f5;
  border-radius: 4px;
}

.mapping-info p {
  margin: 0;
  font-size: 13px;
  color: #666;
}

.mapping-tip {
  margin-top: 8px !important;
  font-size: 12px !important;
  color: #999 !important;
}
</style>
