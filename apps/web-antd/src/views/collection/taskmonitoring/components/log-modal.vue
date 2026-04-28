<script lang="ts" setup>
import { ref, watch, nextTick } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, Input, message, Spin, Empty } from 'ant-design-vue';

import { getLogDetail, getWorkflowLogDetail } from '#/api/taskmonitoring';

defineOptions({ name: 'LogModal' });

const taskInstanceId = ref<number>(0);
const workflowInstanceId = ref<number>(0);
const taskName = ref<string>('');
const logContent = ref<string>('');
const loading = ref(false);
const searchKeyword = ref('');
const logContainerRef = ref<HTMLElement | null>(null);
const skipLineNum = ref(0);
const limit = 1000;

const highlightedLog = ref<string>('');

function highlightKeyword(text: string, keyword: string): string {
  if (!keyword.trim()) return text;
  const regex = new RegExp(`(${escapeRegExp(keyword)})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

watch([logContent, searchKeyword], () => {
  highlightedLog.value = highlightKeyword(logContent.value, searchKeyword.value);
});

async function fetchLogRecursive() {
  if (!taskInstanceId.value && !workflowInstanceId.value) return;

  try {
    let logText = '';
    let lineNum = 0;
    
    if (workflowInstanceId.value) {
      const res = await getWorkflowLogDetail({
        workflowInstanceId: workflowInstanceId.value,
        limit,
        skipLineNum: skipLineNum.value,
      });
      logText = res || '';
      lineNum = logText ? logText.split('\n').length : 0;
    } else {
      const res = await getLogDetail({
        taskInstanceId: taskInstanceId.value,
        limit,
        skipLineNum: skipLineNum.value,
      });
      logText = res?.message || '';
      lineNum = res?.lineNum || 0;
    }

    if (logText) {
      if (skipLineNum.value === 0) {
        logContent.value = logText;
      } else {
        logContent.value += '\n' + logText;
      }
      
      skipLineNum.value += lineNum;
      
      if (logText && lineNum > 0) {
        await fetchLogRecursive();
      } else {
        loading.value = false;
      }
    } else {
      if (skipLineNum.value === 0) {
        logContent.value = '暂无日志内容';
      }
      loading.value = false;
    }
  } catch (error) {
    message.error('获取日志失败');
    if (skipLineNum.value === 0) {
      logContent.value = '获取日志失败';
    }
    loading.value = false;
  }
}

async function fetchLog() {
  skipLineNum.value = 0;
  logContent.value = '';
  loading.value = true;
  
  await fetchLogRecursive();
  
  await nextTick();
  scrollToTop();
}

function scrollToTop() {
  if (logContainerRef.value) {
    logContainerRef.value.scrollTop = 0;
  }
}

function scrollToBottom() {
  if (logContainerRef.value) {
    logContainerRef.value.scrollTop = logContainerRef.value.scrollHeight;
  }
}

function handleRefresh() {
  fetchLog();
}

const [Modal, modalApi] = useVbenModal({
  fullscreenButton: true,
  onCancel() {
    modalApi.close();
  },
  onConfirm() {
    modalApi.close();
  },
  title: '查看日志',
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<{ 
        taskInstanceId?: number; 
        workflowInstanceId?: number;
        taskName: string 
      }>();
      if (data) {
        taskInstanceId.value = data.taskInstanceId || 0;
        workflowInstanceId.value = data.workflowInstanceId || 0;
        taskName.value = data.taskName;
        logContent.value = '';
        searchKeyword.value = '';
        fetchLog();
      }
    }
  },
});
</script>

<template>
  <Modal
    class="w-[900px]"
    :confirm-loading="loading"
    confirm-text="关闭"
    :show-cancel-button="false"
  >
    <div class="log-modal-content">
      <div class="log-header">
        <div class="task-info">
          <span class="label">任务名称：</span>
          <span class="value">{{ taskName }}</span>
        </div>
        <div class="log-actions">
          <Input.Search
            v-model:value="searchKeyword"
            placeholder="搜索关键词"
            style="width: 200px"
            allow-clear
          />
          <Button @click="scrollToTop">回到顶部</Button>
          <Button @click="scrollToBottom">滚动到底部</Button>
          <Button type="primary" :loading="loading" @click="handleRefresh">
            刷新
          </Button>
        </div>
      </div>

      <Spin :spinning="loading && !logContent">
        <div
          ref="logContainerRef"
          class="log-container"
        >
          <pre v-if="logContent && logContent !== '暂无日志内容' && logContent !== '获取日志失败'" class="log-text" v-html="highlightedLog"></pre>
          <div v-else-if="logContent === '暂无日志内容' || logContent === '获取日志失败'" class="log-text">{{ logContent }}</div>
          <Empty v-else description="暂无日志" />
        </div>
      </Spin>
    </div>
  </Modal>
</template>

<style scoped>
.log-modal-content {
  display: flex;
  flex-direction: column;
  height: 600px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.task-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-info .label {
  color: rgba(0, 0, 0, 0.65);
}

.task-info .value {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.85);
}

.log-actions {
  display: flex;
  gap: 8px;
}

.log-container {
  flex: 1;
  overflow: auto;
  padding: 12px;
  background: #1e1e1e;
  border-radius: 6px;
  min-height: 400px;
}

.log-text {
  margin: 0;
  padding: 0;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-all;
}

.log-text :deep(mark) {
  background: #ffeb3b;
  color: #000;
  padding: 0 2px;
  border-radius: 2px;
}
</style>
