<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import {
  Form,
  Input,
  Select,
  Switch,
  Row,
  Col,
  Tag,
  message,
} from 'ant-design-vue';
import { getDataSourceDetailApi, getMetasApi, type DataSourceMeta } from '#/api/datasource/datasource';

interface MaxComputeTargetConfig {
  project: string;
  table_name: string;
  partition_spec: string;
  overwrite: boolean;
}

const props = defineProps<{
  modelValue: MaxComputeTargetConfig;
  datasourceId: number | undefined;
  editMode?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: MaxComputeTargetConfig): void;
  (e: 'update:targetFields', value: string[]): void;
}>();

const config = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const targetTableOptions = ref<Array<{ label: string; value: string }>>([]);
const targetMetasList = ref<DataSourceMeta[]>([]);
const loadingTables = ref(false);

const parsedPartitionFields = computed(() => {
  if (!config.value.partition_spec || !config.value.partition_spec.trim()) {
    return [];
  }
  const fields: { key: string; value: string }[] = [];
  const parts = config.value.partition_spec.split(',');
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

async function loadDatasourceDetail() {
  console.log('[MaxComputeTarget] loadDatasourceDetail called, datasourceId:', props.datasourceId);
  if (!props.datasourceId) {
    return;
  }

  loadingTables.value = true;
  try {
    const detail = await getDataSourceDetailApi(props.datasourceId);
    console.log('[MaxComputeTarget] datasource detail:', detail);
    config.value = {
      ...config.value,
      project: detail.database || detail.datawarehouse || '',
    };

    const metasRes = await getMetasApi(props.datasourceId, 1, 20000);
    console.log('[MaxComputeTarget] metas response:', metasRes);
    targetMetasList.value = metasRes.totalList || [];
    targetTableOptions.value = (metasRes.totalList || []).map((item: DataSourceMeta) => ({
      label: item.tableName,
      value: item.tableName,
    }));

    if (targetTableOptions.value.length === 0) {
      message.warning('该数据源没有可用的表');
    }
  } catch (e) {
    console.error('[MaxComputeTarget] loadDatasourceDetail error:', e);
    message.error('获取目标端数据源信息失败');
  } finally {
    loadingTables.value = false;
  }
}

function loadTargetFields() {
  console.log('[MaxComputeTarget] loadTargetFields called');
  console.log('[MaxComputeTarget] config.table_name:', config.value.table_name);
  console.log('[MaxComputeTarget] targetMetasList length:', targetMetasList.value.length);
  
  if (!config.value.table_name) {
    console.log('[MaxComputeTarget] No table_name, emitting empty targetFields');
    emit('update:targetFields', []);
    return;
  }

  const targetMeta = targetMetasList.value.find((m) => m.tableName === config.value.table_name);
  console.log('[MaxComputeTarget] Found targetMeta:', targetMeta);

  if (targetMeta && targetMeta.columnNames && targetMeta.columnNames.length > 0) {
    console.log('[MaxComputeTarget] Emitting targetFields:', targetMeta.columnNames);
    emit('update:targetFields', targetMeta.columnNames);
  } else {
    console.log('[MaxComputeTarget] No columnNames found, emitting empty');
    emit('update:targetFields', []);
  }
}

watch(() => props.datasourceId, async (newId, oldId) => {
  console.log('[MaxComputeTarget] datasourceId changed:', { newId, oldId, editMode: props.editMode });
  if (newId) {
    await loadDatasourceDetail();
    if (oldId !== undefined && !props.editMode) {
      config.value = {
        ...config.value,
        table_name: '',
        partition_spec: '',
      };
      emit('update:targetFields', []);
    }
    if (props.editMode && config.value.table_name && targetMetasList.value.length > 0) {
      console.log('[MaxComputeTarget] Edit mode, loading target fields for table:', config.value.table_name);
      loadTargetFields();
    }
  } else {
    config.value = {
      ...config.value,
      project: '',
      table_name: '',
      partition_spec: '',
    };
    targetTableOptions.value = [];
    targetMetasList.value = [];
    emit('update:targetFields', []);
  }
}, { immediate: true });

watch(() => config.value.table_name, (newTableName) => {
  console.log('[MaxComputeTarget] table_name changed:', newTableName);
  if (newTableName && targetMetasList.value.length > 0) {
    loadTargetFields();
  } else {
    emit('update:targetFields', []);
  }
});

defineExpose({
  loadDatasourceDetail,
  targetMetasList,
});
</script>

<template>
  <div class="maxcompute-target-config">
    <div class="group-header">
      <span class="group-title">配置</span>
    </div>
    <Form layout="horizontal">
      <Row :gutter="20">
        <Col :span="8">
          <Form.Item label="项目名" required>
            <Input
              v-model:value="config.project"
              placeholder="由数据源自动解析"
              disabled
            />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="表名" required>
            <Select
              v-model:value="config.table_name"
              :options="targetTableOptions"
              :loading="loadingTables"
              placeholder="请选择目标表名"
              show-search
              :disabled="!datasourceId"
            />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="分区">
            <Input
              v-model:value="config.partition_spec"
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
          v-model:checked="config.overwrite"
          checked-children="是"
          un-checked-children="否"
        />
      </Form.Item>
    </Form>
  </div>
</template>

<style scoped>
.maxcompute-target-config {
  padding: 0;
}

.group-header {
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
}

.group-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.partition-fields-display {
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.partition-label {
  display: block;
  margin-bottom: 8px;
  color: #666;
}

.partition-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
