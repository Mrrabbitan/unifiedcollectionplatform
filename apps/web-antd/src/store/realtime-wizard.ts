import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useRealtimeWizardStore = defineStore('realtime-wizard', () => {
  // 1. 定义状态 (State)
  const sourceConfig = ref<Record<string, any>>({});
  const targetConfig = ref<Record<string, any>>({});
  const fieldMapping = ref<any[]>([]);
  const runtimeConfig = ref<Record<string, any>>({});
  const workflowId = ref<string>('');

  // 2. 定义动作 (Actions) - 用于更新数据
  const setSourceConfig = (data: any) => {
    sourceConfig.value = data;
  };

  const setTargetConfig = (data: any) => {
    targetConfig.value = data;
  };

  const setFieldMapping = (data: any) => {
    fieldMapping.value = data;
  };

  const setRuntimeConfig = (data: any) => {
    runtimeConfig.value = data;
  };

  // 用于“编辑模式”一键初始化所有数据
  const initFromApi = (apiData: any) => {
    workflowId.value = apiData.workflowId;
    sourceConfig.value = apiData.sourceConfig || {};
    targetConfig.value = apiData.targetConfig || {};
    fieldMapping.value = apiData.fieldMapping || [];
    runtimeConfig.value = apiData.runtimeConfig || {};
  };

  // 获取所有数据用于提交
  const getAllData = () => ({
    
    sourceConfig: sourceConfig.value,
    targetConfig: targetConfig.value,
    fieldMapping: fieldMapping.value,
    runtimeConfig: runtimeConfig.value,
  });

  // 重置数据（可选，用于取消或重新创建时）
  const reset = () => {
    sourceConfig.value = {};
    targetConfig.value = {};
    fieldMapping.value = [];
    runtimeConfig.value = {};
  };

  return {
    // state
    workflowId,
    sourceConfig,
    targetConfig,
    fieldMapping,
    runtimeConfig,
    // actions
    setSourceConfig,
    setTargetConfig,
    setFieldMapping,
    setRuntimeConfig,
    initFromApi,
    getAllData,
    reset,
  };
});
