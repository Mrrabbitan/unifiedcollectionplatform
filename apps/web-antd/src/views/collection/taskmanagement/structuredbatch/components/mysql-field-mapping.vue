<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { Alert } from 'ant-design-vue';
import FieldMapping from './field-mapping.vue';
import type { DataSourceMeta } from '#/api/datasource/datasource';
import type {
  FieldMappingConfig,
  TableFieldMapper,
} from '#/types/field-mapping';
import {
  createEmptyFieldMappingConfig,
  fieldMappingArrayToMap,
  fieldMappingMapToArray,
} from '#/types/field-mapping';

const props = defineProps<{
  modelValue: FieldMappingConfig;
  sourceDatasourceId: number | undefined;
  targetDatasourceId: number | undefined;
  sourceTables: string[];
  sourceDatabase: string;
  targetDatabase: string;
  tableNameMode: 'select' | 'auto';
  targetTables: string[];
  sourceTablesMeta: DataSourceMeta[];
  targetTablesMeta: DataSourceMeta[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: FieldMappingConfig): void;
}>();

const config = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const sourceFields = ref<string[]>([]);
const targetFields = ref<string[]>([]);
const fieldMapping = ref<Map<string, string>>(new Map());
const isLoadingFields = ref(false);
const fieldMappingRef = ref<InstanceType<typeof FieldMapping> | null>(null);
let initTimer: ReturnType<typeof setTimeout> | null = null;

const isSingleSourceTable = computed(() => props.sourceTables.length === 1);
const canShowMapping = computed(() => {
  return isSingleSourceTable.value && props.tableNameMode === 'select';
});

function loadTableFields() {
  if (!props.sourceDatasourceId || !props.targetDatasourceId) return;
  if (props.sourceTables.length === 0) return;
  
  const sourceTableName = props.sourceTables[0];
  
  const sourceMeta = props.sourceTablesMeta.find((m) => m.tableName === sourceTableName);
  if (sourceMeta && sourceMeta.columnNames) {
    sourceFields.value = sourceMeta.columnNames;
  }
  
  if (props.tableNameMode === 'select' && props.targetTables.length > 0) {
    const targetTableName = props.targetTables[0];
    const targetMeta = props.targetTablesMeta.find((m) => m.tableName === targetTableName);
    if (targetMeta && targetMeta.columnNames) {
      targetFields.value = targetMeta.columnNames;
    }
  } else if (props.tableNameMode === 'auto') {
    if (sourceMeta && sourceMeta.columnNames) {
      targetFields.value = sourceMeta.columnNames;
    }
  }
  
  if (config.value.tableMappers.length > 0 && config.value.tableMappers[0].fieldMapper) {
    fieldMapping.value = fieldMappingArrayToMap(config.value.tableMappers[0]);
  }
}

function debouncedLoadTableFields() {
  if (initTimer) {
    clearTimeout(initTimer);
  }
  initTimer = setTimeout(() => {
    loadTableFields();
    initTimer = null;
  }, 300);
}

function syncToConfig() {
  const tableMapper = fieldMappingMapToArray(
    props.sourceTables[0] || '',
    fieldMapping.value,
  );
  
  config.value = {
    ...config.value,
    tableMappers: [tableMapper],
  };
}

function handleFieldMappingChange(items: { sourceField: string; targetField: string }[]) {
  const newMap = new Map<string, string>();
  items.forEach(item => {
    newMap.set(item.sourceField, item.targetField);
  });
  fieldMapping.value = newMap;
  syncToConfig();
}

watch(() => props.sourceTables, () => {
  if (canShowMapping.value) {
    debouncedLoadTableFields();
  }
}, { deep: true });

watch([() => props.sourceDatasourceId, () => props.targetDatasourceId], () => {
  if (canShowMapping.value) {
    debouncedLoadTableFields();
  }
});

watch([() => props.targetTables, () => props.tableNameMode], () => {
  if (canShowMapping.value) {
    debouncedLoadTableFields();
  }
}, { deep: true });

watch([() => props.sourceTablesMeta.length, () => props.targetTablesMeta.length, () => JSON.stringify(props.sourceTablesMeta), () => JSON.stringify(props.targetTablesMeta)], () => {
  if (canShowMapping.value) {
    debouncedLoadTableFields();
  }
}, { deep: true });

watch(canShowMapping, (canShow) => {
  if (canShow) {
    debouncedLoadTableFields();
  }
});

watch(() => config.value.tableMappers, (newMappers) => {
  if (newMappers.length > 0 && newMappers[0].fieldMapper && canShowMapping.value) {
    fieldMapping.value = fieldMappingArrayToMap(newMappers[0]);
  }
}, { deep: true, immediate: true });

function updateContainerSize() {
  if (fieldMappingRef.value && fieldMappingRef.value.updateContainerSize) {
    fieldMappingRef.value.updateContainerSize();
  }
}

defineExpose({
  updateContainerSize,
});
</script>

<template>
  <div class="mysql-field-mapping">
    <Alert
      v-if="!isSingleSourceTable"
      type="info"
      message="源端选择多个表时，不需要配置字段映射，将自动使用同名字段映射"
      show-icon
    />

    <Alert
      v-else-if="tableNameMode === 'auto'"
      type="info"
      message="自动建表时，不需要配置字段映射，将自动使用同名字段映射"
      show-icon
    />

    <template v-else-if="canShowMapping">
      <Alert
        v-if="sourceTables.length === 0"
        type="warning"
        message="请先在源端选择表"
        show-icon
        style="margin-bottom: 16px;"
      />

      <template v-else>
        <FieldMapping
          ref="fieldMappingRef"
          v-model="fieldMapping"
          :source-fields="sourceFields"
          :target-fields="targetFields"
          :loading="isLoadingFields"
          :auto-same-name-mapping="true"
          @change="handleFieldMappingChange"
        />
      </template>
    </template>
  </div>
</template>

<style scoped>
.mysql-field-mapping {
  padding: 0;
}
</style>
