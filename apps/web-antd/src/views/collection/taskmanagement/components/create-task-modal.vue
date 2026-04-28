<script lang="ts" setup>
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Card, Col, Divider, Radio, RadioGroup, Row } from 'ant-design-vue';
import { useRouter } from 'vue-router';

defineOptions({ name: 'CreateTaskModal' });

const router = useRouter();

const taskType = ref<string>('batch');
const dataType = ref<string>('structured');
const isCDC = ref<string>('yes');

const taskTypeOptions = [
  { 
    label: '批量采集', 
    value: 'batch',
    desc: '适用于离线数据处理，支持定时调度'
  },
  { 
    label: '实时采集', 
    value: 'stream',
    desc: '适用于实时数据流处理，支持持续采集'
  },
];

const dataTypeOptions = [
  { 
    label: '结构化数据', 
    value: 'structured',
    desc: '关系型数据库、数据仓库等结构化数据源'
  },
  { 
    label: '非结构化数据', 
    value: 'unstructured',
    desc: '文件、文档、图片等非结构化数据源'
  },
];

const cdcOptions = [
  { 
    label: '是', 
    value: 'yes',
    desc: '通过CDC机制捕获数据库变更数据'
  },
  { 
    label: '否', 
    value: 'no',
    desc: '通过其他方式采集实时数据'
  },
];

const configSummary = computed(() => {
  if (taskType.value === 'batch') {
    return {
      type: '批量采集',
      subType: dataType.value === 'structured' ? '结构化数据' : '非结构化数据',
      icon: dataType.value === 'structured' ? '📊' : '📁',
      desc: dataType.value === 'structured' 
        ? '从关系型数据库或数据仓库批量抽取数据'
        : '从文件系统或文档存储批量采集数据',
    };
  } else {
    return {
      type: '实时采集',
      subType: isCDC.value === 'yes' ? 'CDC数据' : '非CDC数据',
      icon: isCDC.value === 'yes' ? '🔄' : '⚡',
      desc: isCDC.value === 'yes'
        ? '通过CDC机制实时捕获数据库变更'
        : '通过其他方式实时采集数据流',
    };
  }
});

function handleConfirm() {
  let route = '';
  if (taskType.value === 'batch') {
    route = `/collection/${dataType.value}${taskType.value}`;
  } else {
    const cdcSuffix = isCDC.value === 'yes' ? 'cdc' : '';
    route = `/collection/stream${cdcSuffix}`;
  }
  modalApi.close();
  router.push(route);
}

const [Modal, modalApi] = useVbenModal({
  fullscreenButton: false,
  onCancel() {
    modalApi.close();
  },
  onConfirm: handleConfirm,
  title: '新建采集任务',
});
</script>

<template>
  <Modal class="w-[600px]">
    <div class="space-y-6">
      <div class="task-option-section">
        <div class="section-title">
          <span class="title-icon">📋</span>
          <span class="title-text">选择任务类型</span>
        </div>
        <RadioGroup v-model:value="taskType" class="mt-3 row-card-task">
          <Row :gutter="16" justify="center">
            <Col :span="11" v-for="option in taskTypeOptions" :key="option.value">
              <div 
                class="option-card" 
                :class="{ 'option-card-active': taskType === option.value }"
                @click="taskType = option.value"
              >
                <Radio :value="option.value" class="option-radio">
                  <span class="option-label">{{ option.label }}</span>
                </Radio>
                <div class="option-desc">{{ option.desc }}</div>
              </div>
            </Col>
          </Row>
        </RadioGroup>
      </div>

      <Divider class="my-4" />

      <div class="task-option-section" v-if="taskType === 'batch'">
        <div class="section-title">
          <span class="title-icon">💾</span>
          <span class="title-text">选择数据类型</span>
        </div>
        <RadioGroup v-model:value="dataType" class="mt-3 row-card-task">
          <Row :gutter="16" justify="center">
            <Col :span="11" v-for="option in dataTypeOptions" :key="option.value">
              <div 
                class="option-card" 
                :class="{ 'option-card-active': dataType === option.value }"
                @click="dataType = option.value"
              >
                <Radio :value="option.value" class="option-radio">
                  <span class="option-label">{{ option.label }}</span>
                </Radio>
                <div class="option-desc">{{ option.desc }}</div>
              </div>
            </Col>
          </Row>
        </RadioGroup>
      </div>

      <div class="task-option-section" v-else>
        <div class="section-title">
          <span class="title-icon">🔄</span>
          <span class="title-text">是否为CDC采集</span>
        </div>
        <RadioGroup v-model:value="isCDC" class="mt-3 row-card-task">
          <Row :gutter="16" justify="center">
            <Col :span="11" v-for="option in cdcOptions" :key="option.value">
              <div 
                class="option-card" 
                :class="{ 'option-card-active': isCDC === option.value }"
                @click="isCDC = option.value"
              >
                <Radio :value="option.value" class="option-radio">
                  <span class="option-label">{{ option.label }}</span>
                </Radio>
                <div class="option-desc">{{ option.desc }}</div>
              </div>
            </Col>
          </Row>
        </RadioGroup>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.task-option-section {
  padding: 0 4px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.title-icon {
  font-size: 18px;
}

.title-text {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.option-card {
  position: relative;
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fafafa;
  height: 100%;
  min-height: 90px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  flex-shrink: 0;
}

.option-card:hover {
  border-color: #4096ff;
  background: #f0f7ff;
}

.option-card-active {
  border-color: #1677ff;
  background: #e6f4ff;
  box-shadow: 0 2px 8px rgba(22, 119, 255, 0.15);
}

.option-radio {
  display: flex;
  align-items: center;
}

.option-label {
  font-size: 14px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.88);
  white-space: normal;
  word-break: break-all;
}

.option-desc {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  line-height: 1.5;
  padding-left: 24px;
  white-space: normal;
  word-break: break-all;
  flex: none;
  min-height: 45px;
  max-height: 45px;
  min-width: 200px;
  max-width: 200px;
  overflow: hidden;
}

.summary-card {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
}

.summary-card-content {
  padding: 16px;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px dashed #e2e8f0;
}

.summary-icon {
  font-size: 20px;
}

.summary-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.88);
}

.summary-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.summary-label {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.45);
  min-width: 70px;
}

.summary-value {
  font-size: 14px;
  font-weight: 500;
  color: #1677ff;
}

.summary-desc {
  margin-top: 8px;
  padding: 10px 12px;
  background: rgba(22, 119, 255, 0.08);
  border-radius: 6px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.6;
}

:deep(.ant-radio-wrapper) {
  display: flex;
  align-items: center;
}

:deep(.ant-divider) {
  margin: 16px 0;
}

:deep(.ant-row) {
  display: flex;
  flex-wrap: wrap;
}

:deep(.ant-col) {
  display: flex;
}

.row-card-task {
  width: 100%;
}
</style>
