<script lang="ts" setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useTabs } from '@vben/hooks';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  Button,
  Card,
  Steps,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Divider,
  Space,
  Alert,
  message,
  Tag,
  Row,
  Col,
  Modal,
  Radio,
  Spin,
  Tooltip,
} from 'ant-design-vue';
import { QuestionCircleOutlined } from '@ant-design/icons-vue';

import { getDataSourceListApi, getDataSourceDetailApi, getMetasApi, type DataSourceInfo, type DataSourceMeta } from '#/api/datasource/datasource';
import { getFlinkJobConfigAll, type FlinkJobConfigItem } from '#/api/flink-job-config';
import { getWorkerGroupsAll, getEnvironmentList, getProjectPreference, getQueueList, type EnvironmentItem, type ProjectPreference, type QueueItem } from '#/api/project';
import { verifyWorkflowName, createStructuredBatchTask, updateWorkflowTask, getWorkflowTaskTypeData } from '#/api/taskmanagement';
import { useProjectStore } from '#/store';
import { useAiTaskDraftStore } from '#/store/ai-task-draft';
import type { FieldMappingConfig, TableFieldMapper } from '#/types/field-mapping';
import { createEmptyFieldMappingConfig, parseFieldMappingResponse } from '#/types/field-mapping';
import MySQLSourceConfig from './components/mysql-source-config.vue';
import MySQLTargetConfig from './components/mysql-target-config.vue';
import MySQLFieldMapping from './components/mysql-field-mapping.vue';
import SFTPSourceConfig from './components/sftp-source-config.vue';
import MaxComputeTargetConfig from './components/maxcompute-target-config.vue';
import SFTPFieldMapping from './components/sftp-field-mapping.vue';
import RunConfigForm from './components/run-config-form.vue';

defineOptions({ name: 'StructuredBatchTask' });

const router = useRouter();
const route = useRoute();
const { closeTabByKey } = useTabs();
const projectStore = useProjectStore();

const Step = Steps.Step;

const isEditMode = ref(false);
const editCode = ref<number | null>(null);
const loadingEditData = ref(false);

const currentStep = ref(0);

interface GlobalParam {
  name: string;
  type: 'date' | 'string';
  value: string;
  tN?: number;
  dateFormat?: string;
  formattedValue?: string;
}

const globalParams = ref<GlobalParam[]>([]);

const [GlobalParamsDrawer, globalParamsDrawerApi] = useVbenDrawer({
  onOpenChange: (isOpen) => {
    if (!isOpen) {
      globalParamsDrawerApi.setState({ overlayBlur: 0 });
    }
  },
});

function openGlobalParamsDrawer() {
  globalParamsDrawerApi.setState({
    overlayBlur: 5,
    placement: 'right',
    zIndex: 199,
  }).open();
}

const showParamModal = ref(false);
const newParamName = ref('');
const newParamType = ref<'date' | 'string'>('date');
const newParamValue = ref('');
const newParamTN = ref(1);
const newParamDateFormat = ref('yyyymmdd');

const dateFormatOptions = [
  { label: 'yyyymmdd (如 20260330)', value: 'yyyymmdd' },
  { label: 'yyyymmdd:hhmmss (如 20260330:120000)', value: 'yyyymmdd:hhmmss' },
  { label: 'yyyy-mm-dd (如 2026-03-30)', value: 'yyyy-mm-dd' },
  { label: 'yyyy-mm-dd hh:mm:ss (如 2026-03-30 12:00:00)', value: 'yyyy-mm-dd hh:mm:ss' },
  { label: 'yymmdd (如 260330)', value: 'yymmdd' },
  { label: 'dd (如 30)', value: 'dd' },
  { label: 'yyyy (如 2026)', value: 'yyyy' },
  { label: 'yy (如 26)', value: 'yy' },
  { label: 'yyyymm (如 202603)', value: 'yyyymm' },
  { label: 'yymm (如 2603)', value: 'yymm' },
  { label: 'mm (如 03)', value: 'mm' },
  { label: 'mmdd (如 0330)', value: 'mmdd' },
];

const sourceType = ref<string>('MYSQL');
const targetSystemType = ref<string>('MYSQL');

const sourceDatasourceId = ref<number | undefined>();
const targetDatasourceId = ref<number | undefined>();

const sftpConfig = ref({
  path: '',
  file_filter_pattern: '',
  filename_extension: '',
  file_format_type: 'text',
  field_delimiter: ',',
  encoding: 'UTF-8',
  archive_compress_codec: 'NONE',
  skip_header_row_number: 0,
});

const mysqlSourceConfig = ref({
  datasourceId: undefined as number | undefined,
  database: '',
  tables: [] as string[],
  tableQueries: {} as Record<string, string>,
});

const mysqlSourceConfigRef = ref<InstanceType<typeof MySQLSourceConfig> | null>(null);
const mysqlTargetConfigRef = ref<InstanceType<typeof MySQLTargetConfig> | null>(null);
const sftpFieldMappingRef = ref<InstanceType<typeof SFTPFieldMapping> | null>(null);
const mysqlFieldMappingRef = ref<InstanceType<typeof MySQLFieldMapping> | null>(null);

const sourceTablesMeta = computed(() => {
  if (mysqlSourceConfigRef.value && sourceType.value === 'MYSQL') {
    return mysqlSourceConfigRef.value.allTables || [];
  }
  return [];
});

const targetTablesMeta = computed(() => {
  if (targetSystemType.value === 'MYSQL' && mysqlTargetConfigRef.value) {
    return mysqlTargetConfigRef.value.targetTablesMeta || [];
  }
  return [];
});

const mysqlTargetConfig = ref({
  datasourceId: undefined as number | undefined,
  database: '',
  tableNameMode: 'select' as 'select' | 'auto',
  tables: [] as string[],
  tablePrefix: '',
  tableSuffix: '',
  primaryKeys: [] as string[],
  tablePrimaryKeys: [] as Array<{ tableName: string; primaryKeys: string[] }>,
  dataSaveMode: 'APPEND_DATA' as 'APPEND_DATA' | 'DROP_DATA',
});

const mysqlFieldMapping = ref<FieldMappingConfig>(createEmptyFieldMappingConfig());

const sftpFieldMapping = ref<FieldMappingConfig>(createEmptyFieldMappingConfig());

const sourceFieldInput = ref('');
const sourceFields = ref<string[]>([]);
const targetFields = ref<string[]>([]);
const fieldMapping = ref<Map<string, string>>(new Map());
const useTargetFields = ref(false);

const loadingFields = ref(false);
const fieldsLoaded = ref(false);

const displaySourceFields = computed(() => {
  if (useTargetFields.value) {
    return targetFields.value;
  }
  return sourceFields.value;
});

function syncFieldMapper() {
  const fieldMapperRecord: Record<string, string> = {};
  fieldMapping.value.forEach((value, key) => {
    fieldMapperRecord[key] = value;
  });
  
  sftpFieldMapping.value = {
    tableMappers: [{
      sourceTable: mcConfig.value.table_name || 'target_table',
      fieldMapper: fieldMapperRecord,
    }],
  };
}

function updateFieldMapping(newMap: Map<string, string>) {
  fieldMapping.value = newMap;
  syncFieldMapper();
}

function handleFieldMappingChange(items: { sourceField: string; targetField: string }[]) {
  const newMap = new Map<string, string>();
  items.forEach(item => {
    newMap.set(item.sourceField, item.targetField);
  });
  fieldMapping.value = newMap;
  syncFieldMapper();
}

function parseSourceFields() {
  if (!sourceFieldInput.value.trim()) {
    message.warning('请输入字段信息');
    return false;
  }
  
  const inputText = sourceFieldInput.value.trim();
  const fields: string[] = [];
  
  const lines = inputText.split('\n');
  for (const line of lines) {
    const lineFields = line.split(',').map(f => f.trim()).filter(f => f.length > 0);
    fields.push(...lineFields);
  }
  
  const uniqueFields = new Set<string>();
  const duplicates: string[] = [];
  
  for (const field of fields) {
    if (uniqueFields.has(field)) {
      duplicates.push(field);
    }
    uniqueFields.add(field);
  }
  
  if (duplicates.length > 0) {
    message.error(`存在同名字段: ${duplicates.join(', ')}，请修改后重新输入`);
    return false;
  }
  
  const newFields = Array.from(uniqueFields);
  sourceFields.value = newFields;
  message.success(`成功解析 ${sourceFields.value.length} 个字段`);
  return true;
}

function parseFieldsRealtime() {
  if (!sourceFieldInput.value.trim()) {
    sourceFields.value = [];
    return;
  }
  
  const inputText = sourceFieldInput.value.trim();
  const fields: string[] = [];
  
  const lines = inputText.split('\n');
  for (const line of lines) {
    const lineFields = line.split(',').map(f => f.trim()).filter(f => f.length > 0);
    fields.push(...lineFields);
  }
  
  const uniqueFields = Array.from(new Set(fields));
  sourceFields.value = uniqueFields;
}

watch(sourceFieldInput, () => {
  parseFieldsRealtime();
});

async function loadTargetDatasourceDetail() {
  if (!targetDatasourceId.value) {
    return;
  }
  
  loadingTargetTables.value = true;
  try {
    const detail = await getDataSourceDetailApi(targetDatasourceId.value);
    mcConfig.value.project = detail.database || detail.datawarehouse || '';
    
    const metasRes = await getMetasApi(targetDatasourceId.value, 1, 20000);
    targetMetasList.value = metasRes.totalList || [];
    targetTableOptions.value = (metasRes.totalList || []).map((item: DataSourceMeta) => ({
      label: item.tableName,
      value: item.tableName,
    }));
    
    if (targetTableOptions.value.length === 0) {
      message.warning('该数据源没有可用的表');
    }
  } catch {
    message.error('获取目标端数据源信息失败');
  } finally {
    loadingTargetTables.value = false;
  }
}

function loadTargetFields() {
  if (!mcConfig.value.table_name) {
    message.warning('请先选择目标端表名');
    return;
  }
  
  const targetMeta = targetMetasList.value.find((m) => m.tableName === mcConfig.value.table_name);
  
  if (targetMeta && targetMeta.columnNames && targetMeta.columnNames.length > 0) {
    targetFields.value = targetMeta.columnNames;
    fieldsLoaded.value = true;
    nextTick(() => {
      fieldMappingRef.value?.updateContainerSize();
    });
    message.success(`已加载 ${targetFields.value.length} 个目标端字段`);
  } else {
    targetFields.value = [];
    message.warning('目标端表没有字段信息');
  }
}

async function loadEditData() {
  const code = route.query.code as string;
  const taskType = route.query.taskType as string;
  
  if (!code || taskType !== 'structuredBatch') {
    return;
  }
  
  const projectCode = projectStore.currentProjectCode;
  if (!projectCode) {
    message.error('请先选择项目');
    return;
  }
  
  isEditMode.value = true;
  editCode.value = Number(code);
  loadingEditData.value = true;
  console.log('[Index] loadEditData: setting loadingEditData to true');
  
  try {
    const res = await getWorkflowTaskTypeData(projectCode, Number(code), 'structuredBatch');
    console.log('任务详情', res);
    
    if (res) {
      name.value = res.name || '';
      taskDescription.value = res.description || '';
      
      if (res.globalParams) {
        try {
          globalParams.value = typeof res.globalParams === 'string' 
            ? JSON.parse(res.globalParams) 
            : res.globalParams;
        } catch (e) {
          console.error('解析全局参数失败', e);
        }
      }
      
      if (res.source) {
        try {
          const sourceData = typeof res.source === 'string' 
            ? JSON.parse(res.source) 
            : res.source;
          if (sourceData.type) sourceType.value = sourceData.type;
          if (sourceData.datasourceId) sourceDatasourceId.value = sourceData.datasourceId;
          if (sourceData.config) {
            if (sourceData.type === 'MYSQL') {
              const tableConfigs = sourceData.config.tables || [];
              const tables = tableConfigs.map((t: any) => t.table_path || t);
              const tableQueries: Record<string, string> = {};
              tableConfigs.forEach((t: any) => {
                if (t.table_path && t.query) {
                  tableQueries[t.table_path] = t.query;
                }
              });
              mysqlSourceConfig.value = {
                ...mysqlSourceConfig.value,
                datasourceId: sourceData.datasourceId,
                database: sourceData.config.database || '',
                tables,
                tableQueries,
              };
            } else {
              sftpConfig.value = { ...sftpConfig.value, ...sourceData.config };
            }
          }
          if (sourceData.fields && Array.isArray(sourceData.fields)) {
            sourceFields.value = sourceData.fields;
            sourceFieldInput.value = sourceData.fields.join('\n');
          }
        } catch (e) {
          console.error('解析源端数据失败', e);
        }
      }
      
      if (res.target) {
        try {
          const targetData = typeof res.target === 'string' 
            ? JSON.parse(res.target) 
            : res.target;
          if (targetData.type) targetSystemType.value = targetData.type;
          if (targetData.datasourceId) {
            targetDatasourceId.value = targetData.datasourceId;
            await loadTargetDatasourceDetail();
          }
          if (targetData.config) {
            if (targetData.type === 'MYSQL') {
              mysqlTargetConfig.value = {
                ...mysqlTargetConfig.value,
                datasourceId: targetData.datasourceId,
                database: targetData.config.database || '',
                tableNameMode: targetData.config.tableNameMode || 'auto',
                tables: targetData.config.tables || [],
                tablePrefix: targetData.config.tablePrefix || '',
                tableSuffix: targetData.config.tableSuffix || '',
                primaryKeys: targetData.config.primaryKeys || [],
                tablePrimaryKeys: targetData.config.tablePrimaryKeys || [],
                dataSaveMode: targetData.config.dataSaveMode || 'APPEND_DATA',
              };
            } else {
              mcConfig.value = { ...mcConfig.value, ...targetData.config };
            }
          }
          if (targetData.config?.table_name && targetDatasourceId.value && mcConfig.value.project) {
            const targetMeta = targetMetasList.value.find((m) => m.tableName === targetData.config.table_name);
            if (targetMeta && targetMeta.columnNames && targetMeta.columnNames.length > 0) {
              targetFields.value = targetMeta.columnNames;
              fieldsLoaded.value = true;
            }
          }
        } catch (e) {
          console.error('解析目标端数据失败', e);
        }
      }
      
      if (sourceFields.value.length > 0 && targetFields.value.length > 0) {
        const sourceSet = new Set(sourceFields.value);
        const targetSet = new Set(targetFields.value);
        const isSame = sourceSet.size === targetSet.size && 
          [...sourceSet].every(field => targetSet.has(field));
        if (isSame) {
          useTargetFields.value = true;
        }
      }
      
      if (res.fieldMapper) {
        try {
          const fieldMapperData = typeof res.fieldMapper === 'string'
            ? JSON.parse(res.fieldMapper)
            : res.fieldMapper;
          
          if (sourceType.value === 'MYSQL' && targetSystemType.value === 'MYSQL') {
            const parsed = parseFieldMappingResponse(
              fieldMapperData,
              mysqlSourceConfig.value.tables[0] || '',
            );
            console.log('[Index] MySQL fieldMapping parsed:', parsed);
            mysqlFieldMapping.value = parsed;
          } else {
            console.log('[Index] SFTP-MaxCompute fieldMapperData:', fieldMapperData);
            console.log('[Index] mcConfig.table_name:', mcConfig.value.table_name);
            const parsed = parseFieldMappingResponse(
              fieldMapperData,
              mcConfig.value.table_name || 'target_table',
            );
            console.log('[Index] SFTP-MaxCompute parsed:', parsed);
            sftpFieldMapping.value = parsed;
            console.log('[Index] sftpFieldMapping.value:', sftpFieldMapping.value);

            if (parsed.tableMappers.length > 0 && parsed.tableMappers[0].fieldMapper) {
              const fieldEntries = Object.entries(parsed.tableMappers[0].fieldMapper);
              const targetFieldsFromMapper = fieldEntries.map(([, targetField]) => targetField);
              console.log('[Index] targetFieldsFromMapper:', targetFieldsFromMapper);
              console.log('[Index] current targetFields:', targetFields.value);
              if (targetFields.value.length === 0 && targetFieldsFromMapper.length > 0) {
                targetFields.value = targetFieldsFromMapper;
                console.log('[Index] targetFields updated:', targetFields.value);
              }
            }
          }
        } catch (e) {
          console.error('解析字段映射数据失败', e);
        }
      }
      
      if (res.runConfig) {
        try {
          const runConfigData = typeof res.runConfig === 'string' 
            ? JSON.parse(res.runConfig) 
            : res.runConfig;
          runConfig.value = { ...runConfig.value, ...runConfigData };
        } catch (e) {
          console.error('解析运行配置失败', e);
        }
      }
      
      message.success('任务数据加载成功');
    }
  } catch (error: any) {
    message.error(error?.message || '加载任务数据失败');
  } finally {
    const savedFieldMapping = sftpFieldMapping.value.tableMappers.length > 0 
      ? JSON.parse(JSON.stringify(sftpFieldMapping.value)) 
      : null;
    
    console.log('[Index] loadEditData: setting loadingEditData to false');
    loadingEditData.value = false;
    
    if (savedFieldMapping && isEditMode.value) {
      console.log('[Index] loadEditData: re-setting sftpFieldMapping after watch');
      nextTick(() => {
        sftpFieldMapping.value = savedFieldMapping;
        console.log('[Index] loadEditData: sftpFieldMapping restored');
      });
    }
  }
}

/**
 * 在数据源列表里按 (type, host?, name?) 找最匹配的一条。
 * - host 优先精确命中；name 走精确 + 包含两轮匹配。
 */
function findDatasourceByHostOrName(
  list: DataSourceInfo[],
  type: string,
  host?: string,
  dsName?: string,
): DataSourceInfo | undefined {
  const sameType = list.filter((d) => d.type === type);
  if (host) {
    const exactHost = sameType.find((d) => d.host === host);
    if (exactHost) return exactHost;
  }
  if (dsName) {
    const lower = dsName.toLowerCase();
    const exact = sameType.find((d) => d.name?.toLowerCase() === lower);
    if (exact) return exact;
    const fuzzy = sameType.find((d) =>
      (d.name || '').toLowerCase().includes(lower),
    );
    if (fuzzy) return fuzzy;
  }
  return undefined;
}

/**
 * 监听 mysqlSourceConfig.tables 长度，当 child 把 datasourceId 的 watch 触发完
 * loadTables 后(allTables 出现)即视为表清单加载完成。这里给一个超时保险，避免死等。
 */
async function waitForSourceTablesLoaded(timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if ((mysqlSourceConfigRef.value?.allTables?.length ?? 0) > 0) return;
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
}

/**
 * 把 AI 助手解析出的 plan 套到表单的 ref 上：
 * 1) 任务名 / 描述
 * 2) 源端类型 / 目标端类型
 * 3) 数据源解析（host 精确、name 模糊）→ 写入 datasourceId，
 *    并 await loadTables 后写入 source.tables
 * 4) 目标端 tableNameMode / dataSaveMode
 * 5) runConfig 的 runMode
 * 6) Flink 资源配置：按 resourceName 命中后复刻 handleFlinkConfigChange 的字段映射
 */
async function applyAiDraftIfPresent() {
  if (route.query.fromAi !== '1') return;
  const draftStore = useAiTaskDraftStore();
  const draft = draftStore.consumeDraft('structuredBatch');
  if (!draft) return;

  const filled: string[] = [];
  const skipped: string[] = [];

  if (draft.name) {
    name.value = draft.name;
    filled.push(`任务名「${draft.name}」`);
  }
  if (draft.description) taskDescription.value = draft.description;

  if (draft.source?.type) {
    sourceType.value = draft.source.type;
    filled.push(`源端 ${draft.source.type}`);
  }
  if (draft.target?.type) {
    targetSystemType.value = draft.target.type;
    filled.push(`目标端 ${draft.target.type}`);
  }

  // 等待 sourceType / targetSystemType 切换后子组件渲染完毕
  await nextTick();

  // 拉一次完整的数据源列表（不依赖页面顶层 loadSourceDatasources 的时序）
  let allDatasources: DataSourceInfo[] = [];
  try {
    const res = await getDataSourceListApi(1, 1000, '');
    allDatasources = res.totalList || [];
  } catch (error) {
    console.warn('[AI Assist] 获取数据源列表失败', error);
  }

  // ============ 源端 ============
  if (draft.source?.type === 'MYSQL') {
    const ds = findDatasourceByHostOrName(
      allDatasources,
      'MYSQL',
      draft.source.datasourceHost,
      draft.source.datasourceName,
    );
    if (ds) {
      mysqlSourceConfig.value = {
        ...mysqlSourceConfig.value,
        datasourceId: ds.id,
        database: ds.database || mysqlSourceConfig.value.database,
      };
      filled.push(`源数据源「${ds.name}」`);
      // 等子组件 watch 触发 + loadTables 完成
      await nextTick();
      await waitForSourceTablesLoaded();
      const tables =
        draft.source.tables ?? (draft.source.table ? [draft.source.table] : []);
      if (tables.length > 0) {
        mysqlSourceConfig.value = {
          ...mysqlSourceConfig.value,
          tables,
          tableQueries: tables.reduce<Record<string, string>>((acc, t) => {
            acc[t] = mysqlSourceConfig.value.tableQueries[t] || '';
            return acc;
          }, {}),
        };
        filled.push(`源表 ${tables.join(', ')}`);
      }
    } else if (draft.source.datasourceHost || draft.source.datasourceName) {
      skipped.push(
        `源数据源（${draft.source.datasourceHost ?? draft.source.datasourceName}）`,
      );
    }
  }

  // ============ 目标端 ============
  if (draft.target?.type === 'MYSQL') {
    const ds = findDatasourceByHostOrName(
      allDatasources,
      'MYSQL',
      draft.target.datasourceHost,
      draft.target.datasourceName,
    );
    if (ds) {
      mysqlTargetConfig.value = {
        ...mysqlTargetConfig.value,
        datasourceId: ds.id,
        database: ds.database || mysqlTargetConfig.value.database,
      };
      filled.push(`目标数据源「${ds.name}」`);
    } else if (draft.target.datasourceHost || draft.target.datasourceName) {
      skipped.push(
        `目标数据源（${draft.target.datasourceHost ?? draft.target.datasourceName}）`,
      );
    }
    if (draft.target.tableNameMode) {
      mysqlTargetConfig.value = {
        ...mysqlTargetConfig.value,
        tableNameMode: draft.target.tableNameMode,
      };
      filled.push(
        draft.target.tableNameMode === 'auto' ? '自动建表' : '从已有表中选',
      );
    }
    if (draft.target.dataSaveMode) {
      mysqlTargetConfig.value = {
        ...mysqlTargetConfig.value,
        dataSaveMode: draft.target.dataSaveMode,
      };
      filled.push(
        draft.target.dataSaveMode === 'APPEND_DATA' ? '追加数据' : '覆盖数据',
      );
    }
    if (
      (draft.target.tables?.length || draft.target.table) &&
      draft.target.tableNameMode !== 'auto'
    ) {
      const tables =
        draft.target.tables ?? (draft.target.table ? [draft.target.table] : []);
      mysqlTargetConfig.value = {
        ...mysqlTargetConfig.value,
        tables,
      };
      filled.push(`目标表 ${tables.join(', ')}`);
    }
  } else if (
    draft.target?.type === 'MAXCOMPUTE' &&
    (draft.target.tables?.length || draft.target.table)
  ) {
    const tables =
      draft.target.tables ?? [draft.target.table!];
    mcConfig.value = {
      ...mcConfig.value,
      project: draft.target.database || mcConfig.value.project,
      table_name: tables[0] || mcConfig.value.table_name,
    };
  }

  // ============ 运行配置 ============
  if (draft.runConfig?.runMode) {
    runConfig.value = {
      ...runConfig.value,
      runMode: draft.runConfig.runMode,
    };
    filled.push(`运行模式 ${draft.runConfig.runMode}`);
  }
  if (draft.runConfig?.flinkJobConfigName) {
    try {
      const flinkList = await getFlinkJobConfigAll();
      const target =
        (flinkList || []).find(
          (item: FlinkJobConfigItem) =>
            item.resourceName === draft.runConfig!.flinkJobConfigName,
        ) ||
        (flinkList || []).find((item: FlinkJobConfigItem) =>
          (item.resourceName || '').includes(
            draft.runConfig!.flinkJobConfigName!,
          ),
        );
      if (target) {
        runConfig.value = {
          ...runConfig.value,
          flinkJobConfigId: target.id,
          flinkVersion: target.flinkVersion || runConfig.value.flinkVersion,
          jmMemory: target.jmMemory || runConfig.value.jmMemory,
          tmMemory: target.tmMemory || runConfig.value.tmMemory,
          submitMode: target.submitMode || runConfig.value.submitMode,
          parallelism: target.parallelism || runConfig.value.parallelism,
          slot: target.slots || runConfig.value.slot,
          checkpointInterval:
            target.checkpointIntervalMs || runConfig.value.checkpointInterval,
          checkpointTimeout:
            target.checkpointTimeoutMs || runConfig.value.checkpointTimeout,
          queueName: target.queueName || runConfig.value.queueName,
          checkpointDir: target.checkpointDir || runConfig.value.checkpointDir,
        };
        filled.push(`资源配置「${target.resourceName}」`);
      } else {
        skipped.push(`资源配置（${draft.runConfig.flinkJobConfigName}）`);
      }
    } catch (error) {
      console.warn('[AI Assist] 获取 Flink 资源配置列表失败', error);
      skipped.push(`资源配置（${draft.runConfig.flinkJobConfigName}）`);
    }
  }

  if (filled.length > 0) {
    message.success(
      `AI 助手已为你回填 ${filled.length} 项：${filled.join('、')}`,
    );
  } else {
    message.info('已根据 AI 助手的需求预填关键信息，请补充剩余配置后保存');
  }
  if (skipped.length > 0) {
    message.warning(`未在系统中匹配到：${skipped.join('、')}，请手动选择`);
  }
}

onMounted(() => {
  loadEditData();
  applyAiDraftIfPresent();
});

onUnmounted(() => {
});

const mcConfig = ref({
  project: '',
  table_name: '',
  partition_spec: '',
  overwrite: false,
});

const parsedPartitionFields = computed(() => {
  if (!mcConfig.value.partition_spec || !mcConfig.value.partition_spec.trim()) {
    return [];
  }
  const fields: { key: string; value: string }[] = [];
  const parts = mcConfig.value.partition_spec.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed) {
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim();
        const value = trimmed.substring(eqIndex + 1).trim();
        if (key) {
          fields.push({ key, value });
        }
      }
    }
  }
  return fields;
});

const partitionFieldKeys = computed(() => {
  return new Set(parsedPartitionFields.value.map(f => f.key));
});

const targetTableOptions = ref<Array<{ label: string; value: string }>>([]);
const targetMetasList = ref<DataSourceMeta[]>([]);
const loadingTargetTables = ref(false);

const name = ref('');
const taskDescription = ref('');

const runConfig = ref({
  taskPriority: 2,
  workerGroup: '',
  environmentName: undefined as number | undefined,
  retryTimes: 0,
  retryInterval: 1,
  cpuQuota: 1,
  maxMemory: 2,
  runMode: 'LOCAL',
  flinkVersion: '1.15',
  jmMemory: 1024,
  tmMemory: 1024,
  queueName: '',
  submitMode: 'PER_JOB',
  parallelism: 1,
  slot: 1,
  checkpointInterval: 60000,
  checkpointTimeout: 600000,
  flinkJobConfigId: undefined as number | undefined,
  checkpointDir: '',
  warningType: '',
  tenant: '',
  alertGroups: undefined as number | undefined,
});

const sourceTypeOptions = [
  { label: 'SFTP', value: 'SFTP' },
  { label: 'MySQL', value: 'MYSQL' },
];

const targetSystemTypeOptions = computed(() => {
  if (sourceType.value === 'SFTP') {
    return [{ label: 'MaxCompute', value: 'MAXCOMPUTE' }];
  }
  return [{ label: 'MySQL', value: 'MYSQL' }];
});

const fileFormatOptions = [
  { label: 'text', value: 'text' },
  { label: 'csv', value: 'csv' },
  { label: 'json', value: 'json' },
];

const encodingOptions = [
  { label: 'UTF-8', value: 'UTF-8' },
  { label: 'GBK', value: 'GBK' },
  { label: 'GB2312', value: 'GB2312' },
  { label: 'ISO-8859-1', value: 'ISO-8859-1' },
];

const compressOptions = [
  { label: '无压缩', value: 'NONE' },
  { label: '.gz', value: 'GZ' },
  { label: '.tar', value: 'TAR' },
  { label: '.tar.gz', value: 'TAR_GZ' },
  { label: '.zip', value: 'ZIP' },
];

const priorityOptions = [
  { label: '最高', value: 0 },
  { label: '高', value: 1 },
  { label: '中', value: 2 },
  { label: '低', value: 3 },
];

const runModeOptions = [
  { label: '本地', value: 'LOCAL' },
  { label: 'Flink', value: 'FLINK' },
];

const flinkVersionOptions = [
  { label: '1.13', value: '1.13' },
  { label: '1.15', value: '1.15' },
];

const submitModeOptions = [
  { label: '单作业', value: 'PER_JOB' },
  { label: 'Application', value: 'APPLICATION' },
];

const workerGroupOptions = ref<Array<{ label: string; value: string }>>([]);
const environmentList = ref<EnvironmentItem[]>([]);
const queueOptions = ref<Array<{ label: string; value: string }>>([]);
const loadingQueues = ref(false);

const filteredEnvironmentOptions = computed(() => {
  if (!runConfig.value.workerGroup) {
    return [];
  }
  return environmentList.value
    .filter((e) => {
      if (!e.workerGroups || !Array.isArray(e.workerGroups)) {
        return false;
      }
      return e.workerGroups.includes(runConfig.value.workerGroup);
    })
    .map((e) => ({
      label: e.name,
      value: e.code,
    }));
});

const sourceDatasourceOptions = ref<Array<{ label: string; value: number }>>([]);
const targetDatasourceOptions = ref<Array<{ label: string; value: number }>>([]);
const mysqlSourceDatasourceOptions = ref<Array<{ label: string; value: number }>>([]);
const mysqlTargetDatasourceOptions = ref<Array<{ label: string; value: number }>>([]);

async function loadSourceDatasources() {
  try {
    const res = await getDataSourceListApi(1, 1000, '');
    sourceDatasourceOptions.value = (res.totalList || [])
      .filter((item: DataSourceInfo) => item.type === 'SFTP')
      .map((item: DataSourceInfo) => ({
        label: item.name,
        value: item.id,
      }));
    mysqlSourceDatasourceOptions.value = (res.totalList || [])
      .filter((item: DataSourceInfo) => item.type === 'MYSQL')
      .map((item: DataSourceInfo) => ({
        label: item.name,
        value: item.id,
      }));
  } catch {
    message.error('获取源端数据源列表失败');
  }
}

async function loadTargetDatasources() {
  try {
    const res = await getDataSourceListApi(1, 1000, '');
    targetDatasourceOptions.value = (res.totalList || [])
      .filter((item: DataSourceInfo) => item.type === 'MAXCOMPUTE')
      .map((item: DataSourceInfo) => ({
        label: item.name,
        value: item.id,
      }));
    mysqlTargetDatasourceOptions.value = (res.totalList || [])
      .filter((item: DataSourceInfo) => item.type === 'MYSQL')
      .map((item: DataSourceInfo) => ({
        label: item.name,
        value: item.id,
      }));
  } catch {
    message.error('获取目标端数据源列表失败');
  }
}

async function loadWorkerGroups() {
  try {
    const res = await getWorkerGroupsAll();
    workerGroupOptions.value = (res || []).map((item: string) => ({
      label: item,
      value: item,
    }));
  } catch {
    message.error('获取Worker分组列表失败');
  }
}

async function loadEnvironmentList() {
  try {
    const res = await getEnvironmentList();
    environmentList.value = res || [];
  } catch {
    message.error('获取环境列表失败');
  }
}

async function loadQueueList() {
  loadingQueues.value = true;
  try {
    const res = await getQueueList({ pageSize: 100, pageNo: 1 });
    queueOptions.value = (res?.totalList || []).map((item: QueueItem) => ({
      label: item.queueName || item.queue,
      value: item.queue,
    }));
  } catch {
    console.error('获取队列列表失败');
  } finally {
    loadingQueues.value = false;
  }
}

const priorityMap: Record<string, number> = {
  HIGHEST: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

async function loadProjectPreference() {
  if (!projectStore.currentProjectCode) {
    return;
  }
  
  if (isEditMode.value) {
    return;
  }
  
  try {
    const res = await getProjectPreference(projectStore.currentProjectCode);
    if (res && res.preferences) {
      const preferences: ProjectPreference = typeof res.preferences === 'string' 
        ? JSON.parse(res.preferences) 
        : res.preferences;
      
      if (preferences.taskPriority !== undefined) {
        const priorityValue = priorityMap[preferences.taskPriority];
        if (priorityValue !== undefined) {
          runConfig.value.taskPriority = priorityValue;
        }
      }
      
      if (preferences.workerGroup) {
        runConfig.value.workerGroup = preferences.workerGroup;
      }
      
      if (preferences.environmentCode) {
        runConfig.value.environmentName = preferences.environmentCode;
      }
      
      if (preferences.failRetryTimes !== undefined) {
        runConfig.value.retryTimes = preferences.failRetryTimes;
      }
      
      if (preferences.failRetryInterval !== undefined) {
        runConfig.value.retryInterval = preferences.failRetryInterval;
      }
      
      if (preferences.cpuQuota !== undefined) {
        runConfig.value.cpuQuota = preferences.cpuQuota;
      }
      
      if (preferences.memoryMax !== undefined) {
        runConfig.value.maxMemory = preferences.memoryMax;
      }

      if (preferences.warningType) {
        runConfig.value.warningType = preferences.warningType;
      }

      if (preferences.tenant) {
        runConfig.value.tenant = preferences.tenant;
      }

      if (preferences.alertGroups !== undefined) {
        runConfig.value.alertGroups = preferences.alertGroups;
      }
    }
  } catch (e) {
    console.error('获取项目偏好设置失败', e);
  }
}

loadSourceDatasources();
loadTargetDatasources();
loadWorkerGroups();
loadEnvironmentList();
loadProjectPreference();

watch(targetDatasourceId, async () => {
  console.log('[Index] watch(targetDatasourceId) triggered, loadingEditData:', loadingEditData.value);
  if (loadingEditData.value) {
    console.log('[Index] watch(targetDatasourceId) skipped due to loadingEditData');
    return;
  }
  console.log('[Index] watch(targetDatasourceId) resetting sftpFieldMapping');
  mcConfig.value.project = '';
  mcConfig.value.table_name = '';
  targetTableOptions.value = [];
  targetMetasList.value = [];
  targetFields.value = [];
  fieldMapping.value.clear();
  sftpFieldMapping.value = createEmptyFieldMappingConfig();
  fieldsLoaded.value = false;
  
  if (targetDatasourceId.value) {
    await loadTargetDatasourceDetail();
  }
});

watch(() => mcConfig.value.table_name, (newTableName) => {
  console.log('[Index] watch(mcConfig.table_name) triggered, loadingEditData:', loadingEditData.value, 'newTableName:', newTableName);
  if (loadingEditData.value) {
    console.log('[Index] watch(mcConfig.table_name) skipped due to loadingEditData');
    return;
  }
  console.log('[Index] watch(mcConfig.table_name) resetting sftpFieldMapping');
  targetFields.value = [];
  fieldMapping.value.clear();
  sftpFieldMapping.value = createEmptyFieldMappingConfig();
  fieldsLoaded.value = false;
  
  if (newTableName && targetDatasourceId.value && mcConfig.value.project) {
    const targetMeta = targetMetasList.value.find((m) => m.tableName === newTableName);
    
    if (targetMeta && targetMeta.columnNames && targetMeta.columnNames.length > 0) {
      targetFields.value = targetMeta.columnNames;
      fieldsLoaded.value = true;
      nextTick(() => {
        sftpFieldMappingRef.value?.updateContainerSize();
      });
    } else {
      message.warning('该表没有字段信息');
    }
  }
});

watch(currentStep, (newStep) => {
  if (newStep === 2) {
    setTimeout(() => {
      if (sourceType.value === 'MYSQL' && targetSystemType.value === 'MYSQL') {
        mysqlFieldMappingRef.value?.updateContainerSize();
      } else {
        sftpFieldMappingRef.value?.updateContainerSize();
      }
    }, 100);
  }
});

watch(() => mysqlSourceConfig.value.tables, (newTables, oldTables) => {
  if (newTables.length > 1 && mysqlTargetConfig.value.tableNameMode === 'select') {
    mysqlTargetConfig.value = {
      ...mysqlTargetConfig.value,
      tableNameMode: 'auto',
      tables: [],
      primaryKeys: [],
      tablePrimaryKeys: [],
    };
  } else if (newTables.length === 1 && oldTables && oldTables.length > 1 && mysqlTargetConfig.value.tableNameMode === 'auto') {
    mysqlTargetConfig.value = {
      ...mysqlTargetConfig.value,
      tableNameMode: 'select',
      tables: [],
      primaryKeys: [],
      tablePrimaryKeys: [],
    };
  }
}, { deep: true });

watch(() => runConfig.value.runMode, (newMode) => {
  if (newMode === 'FLINK' && queueOptions.value.length === 0) {
    loadQueueList();
  }
});

watch(sourceType, (newType) => {
  if (newType === 'SFTP') {
    targetSystemType.value = 'MAXCOMPUTE';
  } else if (newType === 'MYSQL') {
    targetSystemType.value = 'MYSQL';
  }
}, { immediate: true });

function formatDate(targetDate: Date, format: string): string {
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const hours = String(targetDate.getHours()).padStart(2, '0');
  const minutes = String(targetDate.getMinutes()).padStart(2, '0');
  const seconds = String(targetDate.getSeconds()).padStart(2, '0');
  const shortYear = String(year).slice(-2);

  switch (format) {
    case 'yyyymmdd':
      return `${year}${month}${day}`;
    case 'yyyymmdd:hhmmss':
      return `${year}${month}${day}:${hours}${minutes}${seconds}`;
    case 'yyyy-mm-dd':
      return `${year}-${month}-${day}`;
    case 'yyyy-mm-dd hh:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'yymmdd':
      return `${shortYear}${month}${day}`;
    case 'dd':
      return day;
    case 'yyyy':
      return `${year}`;
    case 'yy':
      return `${shortYear}`;
    case 'yyyymm':
      return `${year}${month}`;
    case 'yymm':
      return `${shortYear}${month}`;
    case 'mm':
      return month;
    case 'mmdd':
      return `${month}${day}`;
    default:
      return `${year}${month}${day}`;
  }
}

const previewFormattedValue = computed(() => {
  if (newParamType.value === 'string') {
    return newParamValue.value || '(未输入)';
  }
  
  const today = new Date();
  const targetDate = new Date(today);
  targetDate.setDate(today.getDate() - newParamTN.value);
  
  return formatDate(targetDate, newParamDateFormat.value);
});

function addGlobalParam() {
  showParamModal.value = true;
  newParamName.value = '';
  newParamType.value = 'date';
  newParamValue.value = '';
  newParamTN.value = 1;
  newParamDateFormat.value = 'yyyymmdd';
}

function confirmAddParam() {
  if (!newParamName.value) {
    message.warning('请输入参数名称');
    return;
  }
  
  const isDuplicate = globalParams.value.some(
    (param) => param.name === newParamName.value
  );
  if (isDuplicate) {
    message.warning('参数名已存在，请使用不同的参数名');
    return;
  }
  
  if (newParamType.value === 'string' && !newParamValue.value) {
    message.warning('请输入参数值');
    return;
  }
  
  let formattedValue = '';
  
  if (newParamType.value === 'date') {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - newParamTN.value);
    formattedValue = formatDate(targetDate, newParamDateFormat.value);
  } else {
    formattedValue = newParamValue.value;
  }
  
  globalParams.value.push({
    name: newParamName.value,
    type: newParamType.value,
    value: newParamType.value === 'date' ? `T-${newParamTN.value}` : newParamValue.value,
    tN: newParamType.value === 'date' ? newParamTN.value : undefined,
    dateFormat: newParamType.value === 'date' ? newParamDateFormat.value : undefined,
    formattedValue,
  });
  
  showParamModal.value = false;
  message.success('全局参数添加成功');
}

function removeParam(index: number) {
  globalParams.value.splice(index, 1);
}

function nextStep() {
  if (currentStep.value === 0) {
    if (sourceType.value === 'SFTP') {
      if (!sourceDatasourceId.value) {
        message.warning('请选择源端数据源');
        return;
      }
      if (!sftpConfig.value.path) {
        message.warning('请填写源端路径');
        return;
      }
      if (!useTargetFields.value && !parseSourceFields()) {
        return;
      }
    } else if (sourceType.value === 'MYSQL') {
      if (!mysqlSourceConfig.value.datasourceId) {
        message.warning('请选择源端数据源');
        return;
      }
      if (mysqlSourceConfig.value.tables.length === 0) {
        message.warning('请选择至少一个表');
        return;
      }
    }
  }
  
  if (currentStep.value === 1) {
    if (targetSystemType.value === 'MAXCOMPUTE') {
      if (!targetDatasourceId.value) {
        message.warning('请选择目标端数据源');
        return;
      }
      if (!mcConfig.value.project || !mcConfig.value.table_name) {
        message.warning('请填写项目名和表名');
        return;
      }
    } else if (targetSystemType.value === 'MYSQL') {
      if (!mysqlTargetConfig.value.datasourceId) {
        message.warning('请选择目标端数据源');
        return;
      }
      if (!mysqlTargetConfig.value.database) {
        message.warning('请配置目标端数据库');
        return;
      }
      if (mysqlTargetConfig.value.tableNameMode === 'select') {
        if (mysqlTargetConfig.value.tables.length === 0) {
          message.warning('请选择目标端表');
          return;
        }
        if (mysqlTargetConfig.value.tables.length !== mysqlSourceConfig.value.tables.length) {
          message.warning(`目标端表数量需与源端一致，源端选择了 ${mysqlSourceConfig.value.tables.length} 个表`);
          return;
        }
        if (mysqlTargetConfig.value.dataSaveMode === 'APPEND_DATA') {
          if (mysqlTargetConfig.value.tables.length === 1) {
            if (mysqlTargetConfig.value.primaryKeys.length === 0) {
              message.warning('请选择主键字段');
              return;
            }
          } else {
            const allTablesHavePks = mysqlTargetConfig.value.tables.every(table => {
              const tablePk = mysqlTargetConfig.value.tablePrimaryKeys.find(t => t.tableName === table);
              return tablePk && tablePk.primaryKeys.length > 0;
            });
            if (!allTablesHavePks) {
              message.warning('请为所有目标表配置主键');
              return;
            }
          }
        }
      }
    }
  }
  
  if (currentStep.value === 2) {
    if (sourceType.value !== 'MYSQL' || targetSystemType.value !== 'MYSQL') {
      if (sftpFieldMapping.value.tableMappers.length === 0 || 
          Object.keys(sftpFieldMapping.value.tableMappers[0]?.fieldMapper || {}).length === 0) {
        message.warning('请配置字段映射');
        return;
      }
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

const submitting = ref(false);

function buildSourceData() {
  if (sourceType.value === 'MYSQL') {
    const tableConfigs = mysqlSourceConfig.value.tables.map(table => {
      const query = mysqlSourceConfig.value.tableQueries[table] || '';
      return {
        table_path: table,
        ...(query ? { query } : {}),
      };
    });
    return {
      type: sourceType.value,
      datasourceId: mysqlSourceConfig.value.datasourceId,
      config: {
        database: mysqlSourceConfig.value.database,
        tables: tableConfigs,
      },
    };
  }
  return {
    type: sourceType.value,
    datasourceId: sourceDatasourceId.value,
    config: sftpConfig.value,
    fields: useTargetFields.value ? targetFields.value : sourceFields.value,
  };
}

function buildTargetData() {
  if (targetSystemType.value === 'MYSQL') {
    return {
      type: targetSystemType.value,
      datasourceId: mysqlTargetConfig.value.datasourceId,
      config: {
        database: mysqlTargetConfig.value.database,
        tableNameMode: mysqlTargetConfig.value.tableNameMode,
        tables: mysqlTargetConfig.value.tables,
        tablePrefix: mysqlTargetConfig.value.tablePrefix,
        tableSuffix: mysqlTargetConfig.value.tableSuffix,
        primaryKeys: mysqlTargetConfig.value.primaryKeys,
        tablePrimaryKeys: mysqlTargetConfig.value.tablePrimaryKeys,
        schemaSaveMode: 'CREATE_SCHEMA_WHEN_NOT_EXIST',
        dataSaveMode: mysqlTargetConfig.value.dataSaveMode,
      },
    };
  }
  return {
    type: targetSystemType.value,
    datasourceId: targetDatasourceId.value,
    config: mcConfig.value,
  };
}

function buildFieldMapperData(): TableFieldMapper[] {
  if (sourceType.value === 'MYSQL' && targetSystemType.value === 'MYSQL') {
    const isSingleTable = mysqlSourceConfig.value.tables.length === 1;
    const isSelectMode = mysqlTargetConfig.value.tableNameMode === 'select';
    if (isSingleTable && isSelectMode) {
      return mysqlFieldMapping.value.tableMappers;
    }
    return [];
  }
  return sftpFieldMapping.value.tableMappers;
}

async function handleConfirm() {
  if (!projectStore.currentProjectCode) {
    message.warning('请先在顶栏选择项目');
    return;
  }
  
  if (!name.value) {
    message.warning('请填写任务名称');
    return;
  }

  if (sourceType.value === 'MYSQL') {
    if (!mysqlSourceConfig.value.datasourceId) {
      message.warning('请选择源端数据源');
      return;
    }
    if (mysqlSourceConfig.value.tables.length === 0) {
      message.warning('请选择至少一个源端表');
      return;
    }
  }

  if (targetSystemType.value === 'MYSQL') {
    if (!mysqlTargetConfig.value.datasourceId) {
      message.warning('请选择目标端数据源');
      return;
    }
    if (!mysqlTargetConfig.value.database) {
      message.warning('请配置目标端数据库');
      return;
    }
    if (mysqlTargetConfig.value.tableNameMode === 'select') {
      if (mysqlTargetConfig.value.tables.length === 0) {
        message.warning('请选择目标端表');
        return;
      }
      if (mysqlTargetConfig.value.tables.length !== mysqlSourceConfig.value.tables.length) {
        message.warning(`目标端表数量需与源端一致，源端选择了 ${mysqlSourceConfig.value.tables.length} 个表`);
        return;
      }
      if (mysqlTargetConfig.value.dataSaveMode === 'APPEND_DATA') {
        if (mysqlTargetConfig.value.tables.length === 1) {
          if (mysqlTargetConfig.value.primaryKeys.length === 0) {
            message.warning('请选择主键字段');
            return;
          }
        } else {
          const allTablesHavePks = mysqlTargetConfig.value.tables.every(table => {
            const tablePk = mysqlTargetConfig.value.tablePrimaryKeys.find(t => t.tableName === table);
            return tablePk && tablePk.primaryKeys.length > 0;
          });
          if (!allTablesHavePks) {
            message.warning('请为所有目标表配置主键');
            return;
          }
        }
      }
    }
  }
  
  if (!runConfig.value.flinkJobConfigId) {
    message.warning('请选择资源配置');
    return;
  }
  
  if (submitting.value) return;
  submitting.value = true;
  
  try {
    const sourceData = buildSourceData();
    const targetData = buildTargetData();
    const fieldMapperData = buildFieldMapperData();

    if (isEditMode.value) {
      await updateWorkflowTask(
        projectStore.currentProjectCode,
        editCode.value!,
        {
          name: name.value,
          description: taskDescription.value,
          timeout: 0,
          globalParams: JSON.stringify(globalParams.value),
          source: JSON.stringify(sourceData),
          target: JSON.stringify(targetData),
          fieldMapper: JSON.stringify(fieldMapperData),
          runConfig: JSON.stringify(runConfig.value),
        },
      );
      message.success('任务修改成功！');
    } else {
      await verifyWorkflowName(projectStore.currentProjectCode, name.value);
      
      const taskData = {
        name: name.value,
        description: taskDescription.value,
        timeout: 0,
        globalParams: JSON.stringify(globalParams.value),
        source: JSON.stringify(sourceData),
        target: JSON.stringify(targetData),
        fieldMapper: JSON.stringify(fieldMapperData),
        runConfig: JSON.stringify(runConfig.value),
      };
      
      await createStructuredBatchTask(projectStore.currentProjectCode, taskData);
      message.success('任务创建成功！');
    }
    
    const currentPath = route.fullPath;
    handleCancel(false);
    sessionStorage.setItem('taskmanagement_refresh', Date.now().toString());
    await router.push('/collection/taskmanagement');
    closeTabByKey(currentPath);
  } catch (error: any) {
    message.error(error?.message || '任务创建失败');
  } finally {
    submitting.value = false;
  }
}

async function handleCancel(showMessage = true) {
  if (showMessage) {
    message.info(isEditMode.value ? '取消编辑' : '已取消创建');
  }
  
  const currentPath = route.fullPath;
  await router.push('/collection/taskmanagement');
  closeTabByKey(currentPath);
}
</script>

<template>
  <Page
    auto-content-height
    :title="isEditMode ? '编辑任务 - 批量采集结构化数据' : '批量采集 - 结构化数据'"
    :description="isEditMode ? '编辑批量采集结构化数据任务' : '创建批量采集结构化数据任务'"
  >
    <Spin :spinning="loadingEditData" tip="加载任务数据中...">
      <div class="structured-batch-container">
        <Card class="main-card">
          <div class="steps-section">
            <Steps :current="currentStep" class="custom-steps">
              <Step title="选择源端" description="配置源端数据源" />
              <Step title="选择目标端" description="配置目标端数据源" />
              <Step title="字段映射" description="配置字段映射关系" />
              <Step title="运行配置" description="配置任务运行参数" />
            </Steps>
          </div>

          <div class="step-content-section">
            <div v-show="currentStep === 0" class="step-content">
              <div class="content-group">
                <div class="group-header">
                  <span class="group-title">数据源</span>
                  <Button type="link" size="small" @click="openGlobalParamsDrawer">
                    全局参数
                  </Button>
                </div>
                <Form layout="horizontal">
                  <Row :gutter="20">
                    <Col :span="12">
                      <Form.Item label="源端类型" required>
                        <Select
                          v-model:value="sourceType"
                          :options="sourceTypeOptions"
                          placeholder="请选择源端类型"
                        />
                      </Form.Item>
                    </Col>
                    <Col v-if="sourceType === 'SFTP'" :span="12">
                      <Form.Item label="数据源" required>
                        <Select
                          v-model:value="sourceDatasourceId"
                          :options="sourceDatasourceOptions"
                          placeholder="请选择已注册的数据源"
                          show-search
                        />
                      </Form.Item>
                    </Col>
                    <Col v-if="sourceType === 'MYSQL'" :span="12">
                      <Form.Item label="数据源" required>
                        <Select
                          v-model:value="mysqlSourceConfig.datasourceId"
                          :options="mysqlSourceDatasourceOptions"
                          placeholder="请选择MySQL数据源"
                          show-search
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
  
                <MySQLSourceConfig v-if="sourceType === 'MYSQL'" ref="mysqlSourceConfigRef" v-model="mysqlSourceConfig" />

                <template v-if="sourceType === 'SFTP'">
                  <div class="group-header">
                    <span class="group-title">路径与匹配</span>
                  </div>
                  <Form layout="horizontal">
                    <Row :gutter="20">
                      <Col :span="12">
                        <Form.Item label="源端路径" required>
                          <Input
                            v-model:value="sftpConfig.path"
                            placeholder="请输入源端路径，如 /data/files/"
                          />
                        </Form.Item>
                      </Col>
                      <Col :span="12">
                        <Form.Item label="文件匹配格式">
                          <Input
                            v-model:value="sftpConfig.file_filter_pattern"
                            placeholder="请输入文件匹配正则表达式"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>

                  <div class="group-header">
                    <span class="group-title">文件格式</span>
                  </div>
                  <Form layout="horizontal">
                    <Row :gutter="20">
                      <Col :span="8">
                        <Form.Item label="文件扩展名">
                          <Input
                            v-model:value="sftpConfig.filename_extension"
                            placeholder="如 .txt、.csv、.gz"
                          />
                        </Form.Item>
                      </Col>
                      <Col :span="8">
                        <Form.Item label="文件类型">
                          <Select
                            v-model:value="sftpConfig.file_format_type"
                            :options="fileFormatOptions"
                            placeholder="请选择文件类型"
                          />
                        </Form.Item>
                      </Col>
                      <Col :span="8">
                        <Form.Item label="字段分隔符">
                          <Input
                            v-model:value="sftpConfig.field_delimiter"
                            placeholder="如 , 或 \t"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Row :gutter="20">
                      <Col :span="8">
                        <Form.Item label="编码格式">
                          <Select
                            v-model:value="sftpConfig.encoding"
                            :options="encodingOptions"
                            placeholder="请选择编码格式"
                          />
                        </Form.Item>
                      </Col>
                      <Col :span="8">
                        <Form.Item label="压缩格式">
                          <Select
                            v-model:value="sftpConfig.archive_compress_codec"
                            :options="compressOptions"
                            placeholder="请选择压缩格式"
                          />
                        </Form.Item>
                      </Col>
                      <Col :span="8">
                        <Form.Item label="跳过前几行">
                          <InputNumber
                            v-model:value="sftpConfig.skip_header_row_number"
                            :min="0"
                            placeholder="跳过的行数"
                            style="width: 100%"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>

                  <div class="group-header">
                    <span class="group-title">字段信息</span>
                  </div>
                  <Form layout="horizontal">
                    <Form.Item>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <Switch v-model:checked="useTargetFields" />
                        <span>使用目标端的字段</span>
                        <Tooltip title="开启后，源端字段将使用目标端表的字段，无需手动输入">
                          <QuestionCircleOutlined style="color: #999;" />
                        </Tooltip>
                      </div>
                    </Form.Item>
                    <Form.Item v-if="!useTargetFields" label="字段列表" extra="支持多行输入，字段以逗号分隔，无需引号">
                      <Input.TextArea
                        v-model:value="sourceFieldInput"
                        placeholder="请输入字段名称，多个字段以逗号分隔&#10;例如：&#10;id, name, age, email&#10;address, phone, create_time"
                        :rows="4"
                      />
                    </Form.Item>
                    <div v-if="!useTargetFields && sourceFields.length > 0" class="parsed-fields">
                      <span class="fields-label">已解析字段：</span>
                      <div class="fields-tags">
                        <Tag v-for="field in sourceFields" :key="field" color="blue">{{ field }}</Tag>
                      </div>
                    </div>
                    <Alert v-if="useTargetFields" type="info" message="已开启使用目标端字段，请在第二步选择目标端表后，第三步将自动使用目标端字段作为源端字段" show-icon />
                  </Form>
                </template>
              </div>
            </div>

          <div v-show="currentStep === 1" class="step-content">
            <div class="content-group">
              <div class="group-header">
                <span class="group-title">数据源</span>
                <Button type="link" size="small" @click="openGlobalParamsDrawer">
                  全局参数
                </Button>
              </div>
              <Form layout="horizontal">
                <Row :gutter="20">
                  <Col :span="12">
                    <Form.Item label="目标端类型" required>
                      <Select
                        v-model:value="targetSystemType"
                        :options="targetSystemTypeOptions"
                        placeholder="请选择目标端类型"
                      />
                    </Form.Item>
                  </Col>
                  <Col v-if="targetSystemType === 'MAXCOMPUTE'" :span="12">
                    <Form.Item label="数据源" required>
                      <Select
                        v-model:value="targetDatasourceId"
                        :options="targetDatasourceOptions"
                        placeholder="请选择已注册的数据源"
                        show-search
                      />
                    </Form.Item>
                  </Col>
                  <Col v-if="targetSystemType === 'MYSQL'" :span="12">
                    <Form.Item label="数据源" required>
                      <Select
                        v-model:value="mysqlTargetConfig.datasourceId"
                        :options="mysqlTargetDatasourceOptions"
                        placeholder="请选择MySQL数据源"
                        show-search
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>

              <MySQLTargetConfig
                v-if="targetSystemType === 'MYSQL'"
                ref="mysqlTargetConfigRef"
                v-model="mysqlTargetConfig"
                :source-tables="sourceType === 'MYSQL' ? mysqlSourceConfig.tables : []"
                :source-datasource-id="sourceType === 'MYSQL' ? mysqlSourceConfig.datasourceId : undefined"
                :source-database="mysqlSourceConfig.database"
                :source-tables-meta="sourceTablesMeta"
                :edit-mode="isEditMode"
              />

              <template v-if="targetSystemType === 'MAXCOMPUTE'">
                <div class="group-header">
                  <span class="group-title">配置</span>
                </div>
                <Form layout="horizontal">
                  <Row :gutter="20">
                    <Col :span="8">
                      <Form.Item label="项目名" required>
                        <Input
                          v-model:value="mcConfig.project"
                          placeholder="由数据源自动解析"
                          disabled
                        />
                      </Form.Item>
                    </Col>
                    <Col :span="8">
                      <Form.Item label="表名" required>
                        <Select
                          v-model:value="mcConfig.table_name"
                          :options="targetTableOptions"
                          :loading="loadingTargetTables"
                          placeholder="请选择目标表名"
                          show-search
                          :disabled="!targetDatasourceId"
                        />
                      </Form.Item>
                    </Col>
                    <Col :span="8">
                      <Form.Item label="分区">
                        <Input
                          v-model:value="mcConfig.partition_spec"
                          placeholder="如 pt1=202604,pt2=16"
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Row v-if="parsedPartitionFields.length > 0" :gutter="20">
                    <Col :span="24">
                      <div class="partition-fields-display">
                        <span class="partition-label">分区字段：</span>
                        <div class="partition-tags">
                          <Tag v-for="field in parsedPartitionFields" :key="field.key" color="purple">
                            {{ field.key }} = {{ field.value }}
                          </Tag>
                        </div>
                      </div>
                    </Col>
                  </Row>
                  <Form.Item label="是否覆盖">
                    <Switch
                      v-model:checked="mcConfig.overwrite"
                      checked-children="是"
                      un-checked-children="否"
                    />
                  </Form.Item>
                </Form>
              </template>
            </div>
          </div>

          <div v-show="currentStep === 2" class="step-content">
            <div class="content-group">
              <div class="group-header step-group-header">
                <span class="group-title">字段映射</span>
                <Button type="link" size="small" @click="openGlobalParamsDrawer">
                  全局参数
                </Button>
              </div>

              <MySQLFieldMapping
                v-if="sourceType === 'MYSQL' && targetSystemType === 'MYSQL'"
                ref="mysqlFieldMappingRef"
                v-model="mysqlFieldMapping"
                :source-datasource-id="mysqlSourceConfig.datasourceId"
                :target-datasource-id="mysqlTargetConfig.datasourceId"
                :source-tables="mysqlSourceConfig.tables"
                :source-database="mysqlSourceConfig.database"
                :target-database="mysqlTargetConfig.database"
                :table-name-mode="mysqlTargetConfig.tableNameMode"
                :target-tables="mysqlTargetConfig.tables"
                :source-tables-meta="sourceTablesMeta"
                :target-tables-meta="targetTablesMeta"
              />

              <SFTPFieldMapping
                v-else
                ref="sftpFieldMappingRef"
                v-model="sftpFieldMapping"
                :source-fields="displaySourceFields"
                :target-fields="targetFields"
                :loading="loadingFields"
                :partition-fields="Array.from(partitionFieldKeys)"
              />
            </div>
          </div>

          <div v-show="currentStep === 3" class="step-content">
            <div class="content-group">
              <div class="group-header">
                <span class="group-title">运行配置</span>
                <Button type="link" size="small" @click="openGlobalParamsDrawer">
                  全局参数
                </Button>
              </div>
              <RunConfigForm
                v-model:name="name"
                v-model:description="taskDescription"
                v-model:run-config="runConfig"
              />
            </div>
          </div>
        </div>

        <div class="step-actions">
          <Space>
            <Button
              v-if="currentStep > 0"
              @click="prevStep"
            >
              上一步
            </Button>
            <Button
              v-if="currentStep < 3"
              type="primary"
              @click="nextStep"
            >
              下一步
            </Button>
            <Button
              v-if="currentStep === 3"
              type="primary"
              :loading="submitting"
              @click="handleConfirm"
            >
              {{ isEditMode ? '确认修改' : '确认创建' }}
            </Button>
            <Button @click="handleCancel">
              取消
            </Button>
          </Space>
        </div>
      </Card>

      <GlobalParamsDrawer
        title="全局参数"
        append-to-main
        :footer="false"
        class="global-params-drawer"
      >
        <template #extra>
          <Button type="primary" size="small" @click="addGlobalParam">
            添加全局参数
          </Button>
        </template>
        <div class="drawer-content">
          <div v-if="globalParams.length > 0" class="params-list">
            <div v-for="(param, index) in globalParams" :key="index" class="param-item">
              <Tag :color="param.type === 'date' ? 'blue' : 'green'" class="param-tag">
                {{ param.name }}: {{ param.formattedValue }}
              </Tag>
              <Tag v-if="param.type === 'date'" color="orange" class="param-type-tag">
                T-{{ param.tN }}
              </Tag>
              <Button type="link" danger size="small" @click="removeParam(index)">
                删除
              </Button>
            </div>
          </div>
          <div v-else class="no-params">
            暂无全局参数，点击上方按钮添加
          </div>
        </div>
      </GlobalParamsDrawer>
    </div>

    <Modal
      v-model:open="showParamModal"
      title="添加全局参数"
      @ok="confirmAddParam"
      @cancel="showParamModal = false"
      width="520px"
    >
      <Form layout="horizontal">
        <Form.Item label="参数名称" required>
          <Input
            v-model:value="newParamName"
            placeholder="请输入参数名称"
          />
        </Form.Item>
        
        <Form.Item label="参数类型" required>
          <Radio.Group v-model:value="newParamType">
            <Radio value="date">日期</Radio>
            <Radio value="string">字符串</Radio>
          </Radio.Group>
        </Form.Item>

        <div v-if="newParamType === 'date'" class="date-config">
          <Form.Item label="账期 (T-N)">
            <InputNumber
              v-model:value="newParamTN"
              :min="0"
              :max="365"
              placeholder="请输入N的值"
              style="width: 100%"
              addon-before="T-"
            />
          </Form.Item>

          <Form.Item label="日期格式">
            <Select
              v-model:value="newParamDateFormat"
              :options="dateFormatOptions"
              placeholder="请选择日期格式"
            />
          </Form.Item>

          <Form.Item label="预览值">
            <Tag color="blue" class="preview-tag">{{ previewFormattedValue }}</Tag>
          </Form.Item>
        </div>

        <div v-if="newParamType === 'string'" class="string-config">
          <Form.Item label="参数值" required>
            <Input
              v-model:value="newParamValue"
              placeholder="请输入参数值"
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
    </Spin>
  </Page>
</template>

<style scoped>
.structured-batch-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.params-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.param-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #fafafa;
  border-radius: 4px;
}

.param-tag {
  margin: 0;
}

.param-type-tag {
  margin: 0;
}

.no-params {
  color: #999;
  text-align: center;
  padding: 12px;
}

.main-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main-card :deep(.ant-card-body) {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
}

.main-card :deep(.ant-card) {
  border-radius: 20px;
}

.card-title-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a2e;
}

.steps-section {
  flex-shrink: 0;
  padding: 12px 0;
}

.custom-steps {
  padding: 0 8px;
}

.step-content-section {
  flex: 1;
  overflow: auto;
  padding: 8px 0;
}

.step-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.content-group {
  background: #fafafa;
  border-radius: 20px;
  padding: 20px;
  border: 1px solid #f0f0f0;
}

.group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.step-group-header {
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e8e8e8;
}

.group-title {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
}

.mapping-alert {
  margin-bottom: 20px;
}

.mapping-placeholder {
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
}

.mapping-placeholder p {
  margin-bottom: 12px;
  font-weight: 500;
  color: #475569;
}

.mapping-placeholder ul {
  margin: 0;
  padding-left: 24px;
}

.mapping-placeholder li {
  margin-bottom: 8px;
  color: #64748b;
}

.step-actions {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.date-config,
.string-config {
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-top: 12px;
  border: 1px solid #e2e8f0;
}

.preview-tag {
  font-size: 14px;
  padding: 6px 14px;
}

.global-params-drawer :deep(.vben-drawer-content) {
  height: auto !important;
  max-height: 280px;
}

.global-params-drawer :deep(.vben-drawer-body) {
  padding: 16px 24px;
}

.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.parsed-fields {
  margin-top: 12px;
  padding: 12px;
  background: #f6ffed;
  border-radius: 8px;
  border: 1px solid #b7eb8f;
}

.fields-label {
  font-weight: 500;
  color: #52c41a;
  margin-right: 8px;
}

.fields-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.partition-fields-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f9f0ff;
  border-radius: 8px;
  border: 1px solid #d3adf7;
  margin-bottom: 16px;
}

.partition-label {
  font-weight: 500;
  color: #722ed1;
  white-space: nowrap;
}

.partition-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
