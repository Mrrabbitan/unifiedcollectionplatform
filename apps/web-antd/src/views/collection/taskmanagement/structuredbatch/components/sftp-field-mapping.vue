<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import { Alert } from 'ant-design-vue';
import FieldMapping from './field-mapping.vue';
import type {
  FieldMappingConfig,
} from '#/types/field-mapping';
import {
  fieldMappingArrayToMap,
  fieldMappingMapToArray,
} from '#/types/field-mapping';

const props = defineProps<{
  modelValue: FieldMappingConfig;
  sourceFields: string[];
  targetFields: string[];
  loading?: boolean;
  partitionFields?: string[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: FieldMappingConfig): void;
}>();

const config = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const localSourceFields = ref<string[]>([]);
const localTargetFields = ref<string[]>([]);
const fieldMapping = ref<Map<string, string>>(new Map());
const fieldMappingRef = ref<InstanceType<typeof FieldMapping> | null>(null);
const isDataLoaded = ref(false);

const canShowMapping = computed(() => {
  console.log('[SFTPFieldMapping] canShowMapping check:', {
    sourceLen: localSourceFields.value.length,
    targetLen: localTargetFields.value.length,
    sourceFields: localSourceFields.value,
    targetFields: localTargetFields.value,
  });
  return localSourceFields.value.length > 0 && localTargetFields.value.length > 0;
});

function syncToConfig() {
  if (!isDataLoaded.value) {
    console.log('[SFTPFieldMapping] syncToConfig skipped: data not loaded yet');
    return;
  }
  
  console.log('[SFTPFieldMapping] syncToConfig called');
  const tableMapper = fieldMappingMapToArray(
    localSourceFields.value[0] || 'source_table',
    fieldMapping.value,
  );

  config.value = {
    ...config.value,
    tableMappers: [tableMapper],
  };
  console.log('[SFTPFieldMapping] config updated:', config.value);
}

function handleFieldMappingChange(items: { sourceField: string; targetField: string }[]) {
  console.log('[SFTPFieldMapping] handleFieldMappingChange called, items count:', items.length);
  const newMap = new Map<string, string>();
  items.forEach(item => {
    newMap.set(item.sourceField, item.targetField);
  });
  fieldMapping.value = newMap;
  syncToConfig();
}

watch(() => props.sourceFields, (newFields) => {
  console.log('[SFTPFieldMapping] props.sourceFields changed:', newFields);
  localSourceFields.value = newFields;
  checkDataLoaded();
}, { immediate: true });

watch(() => props.targetFields, (newFields) => {
  console.log('[SFTPFieldMapping] props.targetFields changed:', newFields);
  localTargetFields.value = newFields;
  checkDataLoaded();
}, { immediate: true });

function checkDataLoaded() {
  if (localSourceFields.value.length > 0 && localTargetFields.value.length > 0) {
    if (!isDataLoaded.value) {
      console.log('[SFTPFieldMapping] Data loaded, setting isDataLoaded to true');
      isDataLoaded.value = true;
    }
  }
}

watch(() => props.modelValue, (newVal) => {
  console.log('[SFTPFieldMapping] props.modelValue changed:', newVal);
  if (newVal?.tableMappers?.length > 0 && newVal.tableMappers[0]?.fieldMapper) {
    const mapped = fieldMappingArrayToMap(newVal.tableMappers[0]);
    console.log('[SFTPFieldMapping] Watch loaded fieldMapping, size:', mapped.size);
    fieldMapping.value = mapped;
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
  <div class="sftp-field-mapping">
    <Alert
      v-if="localSourceFields.length === 0"
      type="warning"
      message="请先在源端配置字段信息"
      show-icon
      style="margin-bottom: 16px;"
    />

    <Alert
      v-else-if="localTargetFields.length === 0"
      type="warning"
      message="请先在目标端选择表"
      show-icon
      style="margin-bottom: 16px;"
    />

    <template v-else-if="canShowMapping">
      <FieldMapping
        ref="fieldMappingRef"
        v-model="fieldMapping"
        :source-fields="localSourceFields"
        :target-fields="localTargetFields"
        :loading="loading"
        :partition-fields="partitionFields || []"
        :auto-same-name-mapping="true"
        @change="handleFieldMappingChange"
      />
    </template>
  </div>
</template>

<style scoped>
.sftp-field-mapping {
  padding: 0;
}
</style>
