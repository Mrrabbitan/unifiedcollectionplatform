<script lang="ts" setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import {
  Button,
  Spin,
  Alert,
  Tooltip,
} from 'ant-design-vue';

interface FieldMappingItem {
  sourceField: string;
  targetField: string;
  targetFieldType?: string;
}

type MappingMode = 'none' | 'sameRow' | 'sameName' | 'clear';

const props = withDefaults(defineProps<{
  sourceFields: string[];
  targetFields: string[];
  modelValue: Map<string, string>;
  loading?: boolean;
  partitionFields?: string[];
  useTargetFieldsAsSource?: boolean;
  showSameRowMapping?: boolean;
  autoSameNameMapping?: boolean;
}>(), {
  loading: false,
  partitionFields: () => [],
  useTargetFieldsAsSource: false,
  showSameRowMapping: true,
  autoSameNameMapping: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: Map<string, string>): void;
  (e: 'change', items: FieldMappingItem[]): void;
}>();

const mappingContainerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(0);
const containerHeight = ref(400);
const isContainerSizeReady = ref(false);

const isDragging = ref(false);
const dragSourceField = ref<string | null>(null);
const dragLine = ref({ x1: 0, y1: 0, x2: 0, y2: 0 });

const mappingMode = ref<MappingMode>('none');

const partitionFieldKeys = computed(() => new Set(props.partitionFields));

const displaySourceFields = computed(() => {
  if (props.useTargetFieldsAsSource) {
    return props.targetFields;
  }
  return props.sourceFields;
});

const mappingEntries = computed(() => Array.from(props.modelValue.entries()));
const mappedSourceFields = computed(() => new Set(props.modelValue.keys()));
const mappedTargetFields = computed(() => new Set(props.modelValue.values()));
const mappingCount = computed(() => props.modelValue.size);

function updateFieldMapping(newMap: Map<string, string>) {
  emit('update:modelValue', newMap);
  const items: FieldMappingItem[] = Array.from(newMap.entries()).map(([sourceField, targetField]) => ({
    sourceField,
    targetField,
    targetFieldType: '',
  }));
  emit('change', items);
}

function getFieldY(index: number): number {
  return index * 40 + 60;
}

function handleSourceFieldMouseDown(field: string, event: MouseEvent) {
  if (props.useTargetFieldsAsSource && partitionFieldKeys.value.has(field)) {
    return;
  }
  
  event.preventDefault();
  dragSourceField.value = field;
  
  const index = displaySourceFields.value.indexOf(field);
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
  if (partitionFieldKeys.value.has(field)) {
    return;
  }
  
  if (dragSourceField.value) {
    const newMap = new Map(props.modelValue);
    newMap.delete(dragSourceField.value);
    
    for (const [source, target] of newMap.entries()) {
      if (target === field) {
        newMap.delete(source);
      }
    }
    
    newMap.set(dragSourceField.value, field);
    updateFieldMapping(newMap);
  }
}

function handleDeleteMapping(sourceField: string) {
  const newMap = new Map(props.modelValue);
  newMap.delete(sourceField);
  updateFieldMapping(newMap);
}

function sameRowMapping() {
  mappingMode.value = 'sameRow';
  updateContainerSize();
  const newMap = new Map<string, string>();
  let fields = displaySourceFields.value;
  if (props.useTargetFieldsAsSource) {
    fields = fields.filter(f => !partitionFieldKeys.value.has(f));
  }
  const nonPartitionTargetFields = props.targetFields.filter(f => !partitionFieldKeys.value.has(f));
  const minLen = Math.min(fields.length, nonPartitionTargetFields.length);
  for (let i = 0; i < minLen; i++) {
    newMap.set(fields[i], nonPartitionTargetFields[i]);
  }
  updateFieldMapping(newMap);
  nextTick(() => {
    updateContainerSize();
  });
}

function sameNameMapping() {
  mappingMode.value = 'sameName';
  updateContainerSize();
  const newMap = new Map<string, string>();
  const fields = displaySourceFields.value;
  for (const sourceField of fields) {
    const isPartitionField = partitionFieldKeys.value.has(sourceField);
    const shouldSkip = props.useTargetFieldsAsSource && isPartitionField;
    if (props.targetFields.includes(sourceField) && !isPartitionField && !shouldSkip) {
      newMap.set(sourceField, sourceField);
    }
  }
  updateFieldMapping(newMap);
  nextTick(() => {
    updateContainerSize();
  });
}

function clearAllMappings() {
  mappingMode.value = 'clear';
  updateFieldMapping(new Map());
}

function updateContainerSize() {
  if (mappingContainerRef.value) {
    const width = mappingContainerRef.value.offsetWidth;
    if (width > 0) {
      containerWidth.value = width;
      isContainerSizeReady.value = true;
    }
    const fieldCount = Math.max(
      displaySourceFields.value.length,
      props.targetFields.length
    );
    containerHeight.value = Math.max(fieldCount * 40 + 60, 200);
  }
}

let resizeObserver: ResizeObserver | null = null;

function initResizeObserver() {
  if (mappingContainerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      updateContainerSize();
    });
    resizeObserver.observe(mappingContainerRef.value);
  }
}

function destroyResizeObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
}

watch(() => [displaySourceFields.value, props.targetFields], () => {
  nextTick(() => {
    updateContainerSize();
  });
}, { deep: true });

watch(() => props.modelValue, (newVal) => {
  if (newVal.size > 0) {
    setTimeout(() => {
      updateContainerSize();
    }, 50);
    setTimeout(() => {
      updateContainerSize();
    }, 200);
  }
}, { deep: true });

onMounted(() => {
  window.addEventListener('resize', updateContainerSize);
  nextTick(() => {
    updateContainerSize();
    initResizeObserver();
  });
});

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerSize);
  destroyResizeObserver();
});

defineExpose({
  sameNameMapping,
  mappingMode,
  updateContainerSize,
});
</script>

<template>
  <div class="field-mapping-component">
    <div class="mapping-toolbar">
      <Button 
        v-if="showSameRowMapping" 
        :type="mappingMode === 'sameRow' ? 'primary' : 'default'"
        size="small" 
        @click="sameRowMapping"
      >
        同行映射
      </Button>
      <Button 
        size="small" 
        :type="mappingMode === 'sameName' ? 'primary' : 'default'"
        :class="{ 'ml-2': showSameRowMapping }" 
        @click="sameNameMapping"
      >
        同名映射
      </Button>
      <Button 
        size="small" 
        :type="mappingMode === 'clear' ? 'primary' : 'default'"
        class="ml-2" 
        @click="clearAllMappings"
      >
        清除映射
      </Button>
    </div>

    <Spin :spinning="loading">
      <div v-if="displaySourceFields.length === 0 && !useTargetFieldsAsSource" class="mapping-empty">
        <Alert
          message="请先在第一步输入源端字段信息"
          type="warning"
          show-icon
        />
      </div>
      <div v-else-if="useTargetFieldsAsSource && targetFields.length === 0" class="mapping-empty">
        <Alert
          message="请先配置目标端字段信息"
          type="warning"
          show-icon
        />
      </div>
      <div v-else-if="targetFields.length === 0" class="mapping-empty">
        <Alert
          message="目标端表没有字段信息，请检查目标端配置"
          type="warning"
          show-icon
        />
      </div>
      <div v-else ref="mappingContainerRef" class="mapping-container">
        <svg
          :width="containerWidth"
          :height="containerHeight"
          class="mapping-svg"
        >
          <defs>
            <marker
              id="arrowhead-field-mapping"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" class="arrowhead-polygon" />
            </marker>
          </defs>
          
          <template v-if="isContainerSizeReady">
            <line
              v-for="[source, target] in mappingEntries"
              :key="source"
              :x1="150"
              :y1="getFieldY(displaySourceFields.indexOf(source))"
              :x2="containerWidth - 150"
              :y2="getFieldY(targetFields.indexOf(target))"
              stroke-width="2"
              marker-end="url(#arrowhead-field-mapping)"
              class="mapping-line"
              @click="handleDeleteMapping(source)"
            />
            <line
              v-if="isDragging"
              :x1="dragLine.x1"
              :y1="dragLine.y1"
              :x2="dragLine.x2"
              :y2="dragLine.y2"
              stroke-width="2"
              class="mapping-line drag-line"
            />
          </template>
        </svg>
        
        <div class="source-fields">
          <div class="field-list-header">{{ useTargetFieldsAsSource ? '源端字段 (来自目标端)' : `源端字段 (${sourceFields.length})` }}</div>
          <Tooltip
            v-for="(field, index) in displaySourceFields"
            :key="field"
            :title="(useTargetFieldsAsSource && partitionFieldKeys.has(field)) ? '分区字段，不可映射' : field"
            placement="right"
          >
            <div
              class="field-item"
              :class="{
                'field-mapped': mappedSourceFields.has(field),
                'field-dragging': dragSourceField === field,
                'field-partition': useTargetFieldsAsSource && partitionFieldKeys.has(field),
              }"
              :style="{ top: `${getFieldY(index) - 15}px` }"
              @mousedown="handleSourceFieldMouseDown(field, $event)"
            >
              {{ field }}
              <span v-if="useTargetFieldsAsSource && partitionFieldKeys.has(field)" class="partition-badge">分区</span>
            </div>
          </Tooltip>
        </div>
        
        <div class="target-fields">
          <div class="field-list-header">目标端字段 ({{ targetFields.length }})</div>
          <Tooltip
            v-for="(field, index) in targetFields"
            :key="field"
            :title="partitionFieldKeys.has(field) ? '分区字段，不可映射' : field"
            placement="left"
          >
            <div
              class="field-item"
              :class="{
                'field-mapped': mappedTargetFields.has(field),
                'field-partition': partitionFieldKeys.has(field),
              }"
              :style="{ top: `${getFieldY(index) - 15}px` }"
              @mouseup="partitionFieldKeys.has(field) ? null : handleTargetFieldMouseUp(field)"
            >
              {{ field }}
              <span v-if="partitionFieldKeys.has(field)" class="partition-badge">分区</span>
            </div>
          </Tooltip>
        </div>
      </div>
    </Spin>
    
    <div class="mapping-info">
      <p>已映射字段: {{ mappingCount }} / {{ displaySourceFields.length }}</p>
      <p class="mapping-tip">提示：拖动源端字段到目标端字段完成映射；点击连线可删除映射</p>
    </div>
  </div>
</template>

<style scoped>
.field-mapping-component {
  padding: 0;
}

.mapping-toolbar {
  margin-bottom: 16px;
}

.ml-2 {
  margin-left: 8px;
}

.mapping-empty {
  padding: 40px;
  text-align: center;
}

.mapping-container {
  position: relative;
  width: 100%;
  min-height: 400px;
  border: 1px solid hsl(var(--border));
  border-radius: 4px;
  background: hsl(var(--background) / 0.5);
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
  stroke: hsl(var(--primary));
}

.mapping-line:hover {
  stroke: hsl(var(--destructive));
  stroke-width: 3;
}

.arrowhead-polygon {
  fill: hsl(var(--primary));
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
  background: hsl(var(--primary) / 0.1);
  border-bottom: 1px solid hsl(var(--primary) / 0.3);
  font-weight: 600;
  font-size: 12px;
  color: hsl(var(--primary));
}

.field-item {
  position: absolute;
  left: 12px;
  right: 12px;
  padding: 4px 8px;
  background: hsl(var(--background));
  border: 1px solid hsl(var(--border));
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
  border-color: hsl(var(--primary));
  box-shadow: 0 2px 8px hsl(var(--primary) / 0.2);
}

.field-dragging {
  background: hsl(var(--primary) / 0.2);
  border-color: hsl(var(--primary));
  box-shadow: 0 2px 8px hsl(var(--primary) / 0.3);
}

.field-mapped {
  background: hsl(var(--success) / 0.1);
  border-color: hsl(var(--success) / 0.5);
}

.field-partition {
  background: #f5f5f5;
  border-color: #d9d9d9;
  color: #999;
  cursor: not-allowed;
}

.field-partition:hover {
  border-color: #d9d9d9;
  box-shadow: none;
}

.partition-badge {
  margin-left: 4px;
  padding: 0 4px;
  font-size: 10px;
  background: #d9d9d9;
  color: #666;
  border-radius: 2px;
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
  margin-top: 4px !important;
  font-size: 12px !important;
  color: #999 !important;
}
</style>
