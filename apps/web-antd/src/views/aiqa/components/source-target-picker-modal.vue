<script lang="ts" setup>
import type { DataSourceInfo } from '#/api/datasource/datasource';
import type { DatasourcePick, PickedSourceTarget } from '../types';

import { computed, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Empty, message, Select, Spin } from 'ant-design-vue';

import { getDataSourceList } from '#/api/datasource/datasource';

defineOptions({ name: 'AiqaSourceTargetPickerModal' });

const props = defineProps<{
  initial?: PickedSourceTarget | null;
}>();

const emit = defineEmits<{
  (e: 'confirm', value: PickedSourceTarget): void;
  (e: 'cancel'): void;
}>();

interface DsTypeCard {
  type: string;
  label: string;
  icon: string;
  desc: string;
}

const DATASOURCE_TYPE_CARDS: DsTypeCard[] = [
  {
    type: 'MYSQL',
    label: 'MySQL',
    icon: 'mysql',
    desc: '关系型数据库，支持表/Binlog 采集',
  },
  {
    type: 'SFTP',
    label: 'SFTP',
    icon: 'sftp',
    desc: '远程文件服务器，按目录抓取文件',
  },
  {
    type: 'POSTGRESQL',
    label: 'PostgreSQL',
    icon: 'pg',
    desc: '关系型数据库，支持逻辑复制',
  },
  {
    type: 'MAXCOMPUTE',
    label: 'MaxCompute',
    icon: 'odps',
    desc: '阿里云大数据计算服务，常作为目标库',
  },
  {
    type: 'HIVE',
    label: 'Hive',
    icon: 'hive',
    desc: '数据仓库，支持批量读写',
  },
  {
    type: 'OCEANBASE',
    label: 'OceanBase',
    icon: 'ob',
    desc: '分布式 HTAP 数据库',
  },
];

const sourceType = ref<string>(props.initial?.source.type ?? 'MYSQL');
const targetType = ref<string>(props.initial?.target.type ?? 'MYSQL');
const sourceList = ref<DataSourceInfo[]>([]);
const targetList = ref<DataSourceInfo[]>([]);
const sourceLoading = ref(false);
const targetLoading = ref(false);
const sourceId = ref<number | undefined>(props.initial?.source.datasource.id);
const targetId = ref<number | undefined>(props.initial?.target.datasource.id);

async function loadList(type: string, side: 'source' | 'target') {
  if (side === 'source') sourceLoading.value = true;
  else targetLoading.value = true;
  try {
    const list = await getDataSourceList(type);
    if (side === 'source') sourceList.value = list ?? [];
    else targetList.value = list ?? [];
  } catch (error) {
    console.warn('[aiqa] load datasource list failed', error);
    if (side === 'source') sourceList.value = [];
    else targetList.value = [];
  } finally {
    if (side === 'source') sourceLoading.value = false;
    else targetLoading.value = false;
  }
}

watch(
  sourceType,
  (next) => {
    sourceId.value = undefined;
    loadList(next, 'source');
  },
  { immediate: true },
);

watch(
  targetType,
  (next) => {
    targetId.value = undefined;
    loadList(next, 'target');
  },
  { immediate: true },
);

const canConfirm = computed(
  () => Boolean(sourceId.value) && Boolean(targetId.value),
);

function pickFromList(
  list: DataSourceInfo[],
  id: number | undefined,
): DataSourceInfo | undefined {
  return list.find((it) => it.id === id);
}

function handleConfirm() {
  const sourceDs = pickFromList(sourceList.value, sourceId.value);
  const targetDs = pickFromList(targetList.value, targetId.value);
  if (!sourceDs || !targetDs) {
    message.warning('请同时选择源数据源和目标数据源');
    return;
  }
  const value: PickedSourceTarget = {
    source: { type: sourceType.value, datasource: sourceDs } as DatasourcePick,
    target: { type: targetType.value, datasource: targetDs } as DatasourcePick,
  };
  emit('confirm', value);
  modalApi.close();
}

function handleCancel() {
  emit('cancel');
  modalApi.close();
}

const [Modal, modalApi] = useVbenModal({
  fullscreenButton: false,
  closable: false,
  onCancel: handleCancel,
  onConfirm: handleConfirm,
  confirmText: $t('aiqa.confirm'),
  cancelText: $t('aiqa.cancel'),
  title: '智能问答 · 选择数据源',
});

defineExpose({ open: () => modalApi.open(), close: () => modalApi.close() });
</script>

<template>
  <Modal class="aiqa-picker">
    <div class="aiqa-picker__hint">
      请先选择本次会话所使用的<b>源数据源</b>与<b>目标数据源</b>，AI
      助手会基于它们规划自动化采集任务。
    </div>

    <div class="aiqa-picker__columns">
      <div class="aiqa-picker__col">
        <div class="section-title">
          <span class="title-icon">📥</span>
          <span class="title-text">{{ $t('aiqa.sourceTitle') }}</span>
        </div>

        <div class="sub-title">{{ $t('aiqa.step1Type') }}</div>
        <div class="card-grid">
          <div
            v-for="card in DATASOURCE_TYPE_CARDS"
            :key="`src-${card.type}`"
            class="type-card"
            :class="{ 'type-card-active': sourceType === card.type }"
            @click="sourceType = card.type"
          >
            <div class="type-card__label">{{ card.label }}</div>
            <div class="type-card__desc">{{ card.desc }}</div>
          </div>
        </div>

        <div class="sub-title">{{ $t('aiqa.step2Datasource') }}</div>
        <Spin :spinning="sourceLoading" size="small">
          <Select
            v-model:value="sourceId"
            class="ds-select"
            placeholder="请选择数据源"
            :options="
              sourceList.map((d) => ({
                label: `${d.name} · ${d.host || '-'}`,
                value: d.id,
              }))
            "
            :allow-clear="true"
          />
          <Empty
            v-if="!sourceLoading && sourceList.length === 0"
            class="empty-tip"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            :description="$t('aiqa.noDataSource')"
          />
        </Spin>
      </div>

      <div class="aiqa-picker__divider" />

      <div class="aiqa-picker__col">
        <div class="section-title">
          <span class="title-icon">📤</span>
          <span class="title-text">{{ $t('aiqa.targetTitle') }}</span>
        </div>

        <div class="sub-title">{{ $t('aiqa.step1Type') }}</div>
        <div class="card-grid">
          <div
            v-for="card in DATASOURCE_TYPE_CARDS"
            :key="`tgt-${card.type}`"
            class="type-card"
            :class="{ 'type-card-active': targetType === card.type }"
            @click="targetType = card.type"
          >
            <div class="type-card__label">{{ card.label }}</div>
            <div class="type-card__desc">{{ card.desc }}</div>
          </div>
        </div>

        <div class="sub-title">{{ $t('aiqa.step2Datasource') }}</div>
        <Spin :spinning="targetLoading" size="small">
          <Select
            v-model:value="targetId"
            class="ds-select"
            placeholder="请选择数据源"
            :options="
              targetList.map((d) => ({
                label: `${d.name} · ${d.host || '-'}`,
                value: d.id,
              }))
            "
            :allow-clear="true"
          />
          <Empty
            v-if="!targetLoading && targetList.length === 0"
            class="empty-tip"
            :image="Empty.PRESENTED_IMAGE_SIMPLE"
            :description="$t('aiqa.noDataSource')"
          />
        </Spin>
      </div>
    </div>

    <div v-if="!canConfirm" class="aiqa-picker__footer-tip">
      请同时选择源/目标数据源后再进入对话。
    </div>
  </Modal>
</template>

<style scoped>
.aiqa-picker {
  width: 880px;
}

.aiqa-picker__hint {
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 13px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.6);
  background: linear-gradient(135deg, #eef4ff 0%, #f5f7ff 100%);
  border: 1px solid #dbe7ff;
  border-radius: 6px;
}

.aiqa-picker__columns {
  display: flex;
  gap: 18px;
  align-items: stretch;
}

.aiqa-picker__col {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.aiqa-picker__divider {
  width: 1px;
  margin: 4px 0;
  background: #f0f0f0;
}

.section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}

.title-icon {
  font-size: 16px;
}

.title-text {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.sub-title {
  margin: 12px 0 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.type-card {
  padding: 10px 12px;
  cursor: pointer;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.type-card:hover {
  background: #f0f7ff;
  border-color: #4096ff;
}

.type-card-active {
  background: #e6f4ff;
  border-color: #1677ff;
  box-shadow: 0 2px 6px rgba(22, 119, 255, 0.18);
}

.type-card__label {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.type-card__desc {
  margin-top: 4px;
  overflow: hidden;
  font-size: 12px;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.45);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ds-select {
  width: 100%;
}

.empty-tip {
  margin-top: 8px;
}

.aiqa-picker__footer-tip {
  margin-top: 14px;
  font-size: 12px;
  color: #d97706;
  text-align: right;
}
</style>
