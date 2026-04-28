<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import {
  Form,
  Input,
  Select,
  Row,
  Col,
  InputNumber,
  message,
} from 'ant-design-vue';
import { useProjectStore } from '#/store/project';
import { getProjectPreference } from '#/api/project';
import type { ProjectPreference } from '#/api/project';
import { getFlinkJobConfigAll, type FlinkJobConfigItem } from '#/api/flink-job-config';

interface RunConfig {
  taskPriority: number;
  workerGroup: string;
  environmentName: number | undefined;
  retryTimes: number;
  retryInterval: number;
  cpuQuota: number;
  maxMemory: number;
  runMode: string;
  flinkVersion: string;
  jmMemory: number;
  tmMemory: number;
  queueName: string;
  submitMode: string;
  parallelism: number;
  slot: number;
  checkpointInterval: number;
  checkpointTimeout: number;
  sparkVersion: string;
  flinkJobConfigId?: number | undefined;
  checkpointDir?: string;
  warningType?: string;
  tenant?: string;
  alertGroups?: number;
}

const props = defineProps<{
  name: string;
  description: string;
  runConfig: RunConfig;
}>();

const emit = defineEmits<{
  (e: 'update:name', value: string): void;
  (e: 'update:description', value: string): void;
  (e: 'update:runConfig', value: RunConfig): void;
}>();

const projectStore = useProjectStore();

const localName = computed({
  get: () => props.name,
  set: (val) => emit('update:name', val),
});

const localDescription = computed({
  get: () => props.description,
  set: (val) => emit('update:description', val),
});

const localRunConfig = computed({
  get: () => props.runConfig,
  set: (val) => emit('update:runConfig', val),
});

const runModeOptions = [
  { label: 'LOCAL', value: 'LOCAL' },
  { label: 'FLINK', value: 'FLINK' },
];

const flinkVersionOptions = [
  { label: '1.15', value: '1.15' },
  { label: '1.16', value: '1.16' },
  { label: '1.17', value: '1.17' },
];

const submitModeOptions = [
  { label: 'PER_JOB', value: 'PER_JOB' },
  { label: 'SESSION', value: 'SESSION' },
];

const loadingPreference = ref(false);
const flinkJobConfigOptions = ref<Array<{ label: string; value: number }>>([]);
const loadingFlinkConfig = ref(false);

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
  
  loadingPreference.value = true;
  try {
    const res = await getProjectPreference(projectStore.currentProjectCode);
    if (res && res.preferences) {
      const preferences: ProjectPreference = typeof res.preferences === 'string' 
        ? JSON.parse(res.preferences) 
        : res.preferences;
      
      const updatedConfig = { ...localRunConfig.value };
      
      if (preferences.taskPriority !== undefined) {
        const priorityValue = priorityMap[preferences.taskPriority];
        if (priorityValue !== undefined) {
          updatedConfig.taskPriority = priorityValue;
        }
      }
      
      if (preferences.workerGroup) {
        updatedConfig.workerGroup = preferences.workerGroup;
      }
      
      if (preferences.environmentCode) {
        updatedConfig.environmentName = preferences.environmentCode;
      }
      
      if (preferences.failRetryTimes !== undefined) {
        updatedConfig.retryTimes = preferences.failRetryTimes;
      }
      
      if (preferences.failRetryInterval !== undefined) {
        updatedConfig.retryInterval = preferences.failRetryInterval;
      }
      
      if (preferences.cpuQuota !== undefined) {
        updatedConfig.cpuQuota = preferences.cpuQuota;
      }
      
      if (preferences.memoryMax !== undefined) {
        updatedConfig.maxMemory = preferences.memoryMax;
      }

      if (preferences.warningType) {
        updatedConfig.warningType = preferences.warningType;
      }

      if (preferences.tenant) {
        updatedConfig.tenant = preferences.tenant;
      }

      if (preferences.alertGroups !== undefined) {
        updatedConfig.alertGroups = preferences.alertGroups;
      }
      
      localRunConfig.value = updatedConfig;
    }
  } catch (e) {
    console.error('获取项目偏好设置失败', e);
  } finally {
    loadingPreference.value = false;
  }
}

async function loadFlinkJobConfigList() {
  loadingFlinkConfig.value = true;
  try {
    const res = await getFlinkJobConfigAll();
    flinkJobConfigOptions.value = (res || []).map((item: FlinkJobConfigItem) => ({
      label: item.resourceName,
      value: item.id,
    }));
  } catch (e) {
    console.error('获取Flink资源配置列表失败', e);
  } finally {
    loadingFlinkConfig.value = false;
  }
}

async function handleFlinkConfigChange(configId: number | undefined) {
  if (!configId) {
    return;
  }
  
  try {
    const res = await getFlinkJobConfigAll();
    const config = (res || []).find((item: FlinkJobConfigItem) => item.id === configId);
    
    if (config) {
      localRunConfig.value = {
        ...localRunConfig.value,
        flinkJobConfigId: configId,
        flinkVersion: config.flinkVersion || localRunConfig.value.flinkVersion,
        jmMemory: config.jmMemory || localRunConfig.value.jmMemory,
        tmMemory: config.tmMemory || localRunConfig.value.tmMemory,
        submitMode: config.submitMode || localRunConfig.value.submitMode,
        parallelism: config.parallelism || localRunConfig.value.parallelism,
        slot: config.slots || localRunConfig.value.slot,
        checkpointInterval: config.checkpointIntervalMs || localRunConfig.value.checkpointInterval,
        checkpointTimeout: config.checkpointTimeoutMs || localRunConfig.value.checkpointTimeout,
        queueName: config.queueName || localRunConfig.value.queueName,
        checkpointDir: config.checkpointDir || localRunConfig.value.checkpointDir,
      };
    }
  } catch (e) {
    message.error('获取Flink资源配置详情失败');
  }
}

async function loadFlinkConfigById(configId: number) {
  try {
    const res = await getFlinkJobConfigAll();
    const config = (res || []).find((item: FlinkJobConfigItem) => item.id === configId);
    
    if (config) {
      localRunConfig.value = {
        ...localRunConfig.value,
        flinkVersion: config.flinkVersion || localRunConfig.value.flinkVersion,
        jmMemory: config.jmMemory || localRunConfig.value.jmMemory,
        tmMemory: config.tmMemory || localRunConfig.value.tmMemory,
        submitMode: config.submitMode || localRunConfig.value.submitMode,
        parallelism: config.parallelism || localRunConfig.value.parallelism,
        slot: config.slots || localRunConfig.value.slot,
        checkpointInterval: config.checkpointIntervalMs || localRunConfig.value.checkpointInterval,
        checkpointTimeout: config.checkpointTimeoutMs || localRunConfig.value.checkpointTimeout,
        queueName: config.queueName || localRunConfig.value.queueName,
        checkpointDir: config.checkpointDir || localRunConfig.value.checkpointDir,
      };
    }
  } catch (e) {
    console.error('获取Flink资源配置详情失败', e);
  }
}

onMounted(() => {
  loadProjectPreference();
  loadFlinkJobConfigList();
});

watch(() => projectStore.currentProjectCode, () => {
  loadProjectPreference();
  loadFlinkJobConfigList();
});

watch(
  () => localRunConfig.value.flinkJobConfigId,
  (newId, oldId) => {
    if (newId && localRunConfig.value.runMode === 'FLINK') {
      if (newId !== oldId) {
        loadFlinkConfigById(newId);
      }
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="run-config-form">
    <Form layout="horizontal">
      <Row :gutter="20">
        <Col :span="12">
          <Form.Item label="任务名称" required>
            <Input
              :value="localName"
              placeholder="请输入任务名称"
              @update:value="localName = $event"
            />
          </Form.Item>
        </Col>
        <Col :span="12">
          <Form.Item label="任务描述">
            <Input
              :value="localDescription"
              placeholder="请输入任务描述"
              @update:value="localDescription = $event"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row :gutter="20">
        <Col :span="12">
          <Form.Item label="运行模式" required>
            <Select
              :value="localRunConfig.runMode"
              :options="runModeOptions"
              placeholder="请选择运行模式"
              @update:value="localRunConfig = { ...localRunConfig, runMode: $event }"
            />
          </Form.Item>
        </Col>
        <Col :span="12">
          <Form.Item label="资源配置" required>
            <Select
              :value="localRunConfig.flinkJobConfigId"
              :options="flinkJobConfigOptions"
              :loading="loadingFlinkConfig"
              placeholder="请选择资源配置"
              @update:value="handleFlinkConfigChange"
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  </div>
</template>

<style scoped>
.run-config-form {
  padding: 0;
}
</style>
