<script lang="ts" setup>
import type { ActionItem, ChatMessage, PickedSourceTarget } from '../types';

import { computed, nextTick, ref, watch } from 'vue';

import { $t } from '@vben/locales';

import { Button, message, Tag } from 'ant-design-vue';

import { createDataSourceApi } from '#/api/datasource/datasource';
import { createStructuredBatchTask } from '#/api/taskmanagement';
import { useProjectStore } from '#/store';

import { useAiChat } from '../composables/useAiChat';
import { useDocxUpload } from '../composables/useDocxUpload';
import ChatBubble from './chat-bubble.vue';

defineOptions({ name: 'AiqaChatPage' });

const props = defineProps<{
  picked: PickedSourceTarget | null;
}>();

const emit = defineEmits<{
  (e: 'switch-source'): void;
  (e: 'new-chat'): void;
  (e: 'request-pick'): void;
}>();

const projectStore = useProjectStore();

const SUGGESTIONS = [
  '上传一份接口文档，自动生成 SFTP 采集任务',
  '我希望把源端 user 表实时同步到目标库',
  '从源数据源的某张表每天 02:00 全量抽取到目标库',
  '帮我用源/目标两个数据源建一个数据校验任务',
  '当前源数据源里有哪些表？给我推荐能直接同步的表',
  '把源端最近 7 天的数据增量同步到目标端',
  '解释一下我现在选的源端和目标端类型，分别有什么注意事项',
  '帮我列出"接口文档 → 采集任务"的标准化流程',
];

const inputText = ref('');
const scrollEl = ref<HTMLElement | null>(null);
const docx = useDocxUpload();
const fileInputRef = ref<HTMLInputElement | null>(null);

/**
 * 用户在「未选择源/目标」时点击发送 → 先把意图记下来，
 * 弹出选择框；选定后 watch(props.picked) 会自动续发。
 */
const pendingSend = ref(false);

const {
  messages,
  sending,
  send,
  stop,
  reset,
  answerQuestion,
} = useAiChat({ onAction: handleAutoAction });

const hasPicked = computed(() => !!props.picked);

const sourceLabel = computed(() =>
  props.picked
    ? `${props.picked.source.type} · ${props.picked.source.datasource.name}`
    : '',
);
const targetLabel = computed(() =>
  props.picked
    ? `${props.picked.target.type} · ${props.picked.target.datasource.name}`
    : '',
);

const isEmpty = computed(() => messages.value.length === 0);

watch(
  messages,
  () => {
    nextTick(() => {
      const el = scrollEl.value;
      if (el) el.scrollTop = el.scrollHeight;
    });
  },
  { deep: true },
);

async function handleAutoAction(msg: ChatMessage, action: ActionItem) {
  const target = msg.actions?.find((a) => a.id === action.id);
  if (!target || target.status !== 'pending') return;
  target.status = 'running';
  try {
    if (action.kind === 'create-datasource' && action.payload?.datasourcePayload) {
      const result = await createDataSourceApi(action.payload.datasourcePayload);
      target.status = 'success';
      target.result = result;
      target.payload = {
        ...target.payload,
        link: { label: '查看数据源', to: '/datasource/list' },
      };
    } else if (action.kind === 'create-task' && action.payload?.taskPayload) {
      const code = projectStore.currentProject?.code || 0;
      const tp = action.payload.taskPayload;
      const data: Record<string, any> = {
        name: tp.name,
        description: tp.description ?? '',
        timeout: tp.timeout ?? 0,
        source: JSON.stringify(tp.source),
        target: JSON.stringify(tp.target),
      };
      if (tp.fieldMapper) data.fieldMapper = JSON.stringify(tp.fieldMapper);
      if (tp.runConfig) data.runConfig = JSON.stringify(tp.runConfig);
      const result = await createStructuredBatchTask(code, data);
      target.status = 'success';
      target.result = result;
      target.payload = {
        ...target.payload,
        link: { label: '查看采集任务', to: '/collection/taskmanagement' },
      };
      // 触发采集任务管理页面 onActivated 时强制 reload
      sessionStorage.setItem('taskmanagement_refresh', '1');
    } else {
      target.status = 'success';
    }
  } catch (error) {
    target.status = 'fail';
    target.error = (error as Error).message;
    message.error(`自动执行失败：${target.step}`);
  }
}

function pickFile() {
  fileInputRef.value?.click();
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) await docx.pickAndUpload(file);
  input.value = '';
}

async function doSend(text?: string) {
  const t = (text ?? inputText.value).trim();
  if (!t && !docx.attachment.value) return;
  if (sending.value) return;
  if (!props.picked) {
    pendingSend.value = true;
    emit('request-pick');
    return;
  }
  await send({
    source: props.picked.source,
    target: props.picked.target,
    text: t,
    attachment: docx.attachment.value,
  });
  inputText.value = '';
  docx.clear();
}

watch(
  () => props.picked,
  async (newPicked) => {
    if (!newPicked || !pendingSend.value) return;
    pendingSend.value = false;
    await doSend();
  },
);

function cancelPendingSend() {
  pendingSend.value = false;
}

defineExpose({ cancelPendingSend });

function pickSuggestion(s: string) {
  inputText.value = s;
}

function onQuestionSubmit(payload: {
  msgId: string;
  answers: Record<string, string>;
}) {
  if (!props.picked) {
    pendingSend.value = true;
    emit('request-pick');
    return;
  }
  void answerQuestion(payload.msgId, payload.answers, {
    source: props.picked.source,
    target: props.picked.target,
  });
}

function onSwitch() {
  emit('switch-source');
}

function onNewChat() {
  // 新建对话由父组件统一管理（创建新的 Conversation 并弹出选择框）
  inputText.value = '';
  docx.clear();
  emit('new-chat');
}

// 旧的「清空当前对话」入口仍然保留为隐式能力；目前 UI 不再单独暴露。
void reset;

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    void doSend();
  }
}
</script>

<template>
  <div class="aiqa">
    <header class="aiqa__header">
      <div class="aiqa__head-center">
        <div class="aiqa__title">{{ $t('aiqa.newChat') }}</div>
        <div class="aiqa__sub">{{ $t('aiqa.disclaimer') }}</div>
      </div>
      <div class="aiqa__head-right">
        <template v-if="hasPicked">
          <Tag color="blue">源 {{ sourceLabel }}</Tag>
          <Tag color="purple">目标 {{ targetLabel }}</Tag>
          <Button size="small" @click="onSwitch">{{
            $t('aiqa.switchSource')
          }}</Button>
        </template>
        <template v-else>
          <Tag color="default">未选择数据源</Tag>
          <Button size="small" type="primary" ghost @click="onSwitch">
            选择数据源
          </Button>
        </template>
        <Button size="small" type="link" @click="onNewChat">新对话</Button>
      </div>
    </header>

    <main ref="scrollEl" class="aiqa__main">
      <div v-if="isEmpty" class="aiqa__empty">
        <div class="aiqa__welcome">{{ $t('aiqa.welcome') }}</div>
        <div class="aiqa__suggestions">
          <button
            v-for="s in SUGGESTIONS"
            :key="s"
            class="aiqa__suggestion"
            @click="pickSuggestion(s)"
          >
            {{ s }}
          </button>
        </div>
      </div>
      <div v-else class="aiqa__messages">
        <ChatBubble
          v-for="m in messages"
          :key="m.id"
          :msg="m"
          @submit-question="onQuestionSubmit"
        />
      </div>
    </main>

    <footer class="aiqa__footer">
      <div v-if="docx.attachment.value" class="aiqa__chip">
        📎 {{ docx.attachment.value.fileName }}
        <span class="aiqa__chip-size"
          >({{ Math.round(docx.attachment.value.size / 1024) }} KB)</span
        >
        <a class="aiqa__chip-x" @click="docx.clear()">×</a>
      </div>
      <div class="aiqa__inputbox">
        <textarea
          v-model="inputText"
          class="aiqa__textarea"
          :placeholder="$t('aiqa.placeholder')"
          rows="2"
          @keydown="onKeyDown"
        />
        <div class="aiqa__actions">
          <input
            ref="fileInputRef"
            type="file"
            accept=".docx,.doc"
            style="display: none"
            @change="onFileChange"
          />
          <Button
            size="small"
            :loading="docx.uploading.value"
            @click="pickFile"
          >
            📎 {{ $t('aiqa.uploadDoc') }}
          </Button>
          <Button
            v-if="sending"
            size="small"
            danger
            @click="stop"
          >
            {{ $t('aiqa.stop') }}
          </Button>
          <Button
            v-else
            size="small"
            type="primary"
            :disabled="!inputText.trim() && !docx.attachment.value"
            @click="() => doSend()"
          >
            {{ $t('aiqa.send') }}
          </Button>
        </div>
      </div>
      <div class="aiqa__hint">
        Enter 发送 · Shift + Enter 换行 · 支持上传 .docx 接口文档
      </div>
    </footer>
  </div>
</template>

<style scoped>
.aiqa {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #fff;
}

.aiqa__header {
  position: relative;
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.aiqa__head-center {
  flex: 1;
  text-align: center;
}

.aiqa__title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.aiqa__sub {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
}

.aiqa__head-right {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
}

.aiqa__main {
  flex: 1;
  padding: 24px 12%;
  overflow-y: auto;
  background: #fff;
}

@media (width <= 1440px) {
  .aiqa__main {
    padding: 24px 6%;
  }
}

@media (width <= 1100px) {
  .aiqa__main {
    padding: 18px 16px;
  }
}

.aiqa__empty {
  display: flex;
  flex-direction: column;
  gap: 28px;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.aiqa__welcome {
  font-size: 28px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  letter-spacing: 0.5px;
}

.aiqa__suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  max-width: 720px;
}

.aiqa__suggestion {
  padding: 8px 14px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  cursor: pointer;
  background: #f3f4f6;
  border: 1px solid transparent;
  border-radius: 999px;
  transition: all 0.15s ease;
}

.aiqa__suggestion:hover {
  color: #1677ff;
  background: #e6f4ff;
  border-color: #91caff;
}

.aiqa__messages {
  max-width: 920px;
  margin: 0 auto;
}

.aiqa__footer {
  padding: 12px 12%;
  border-top: 1px solid #f0f0f0;
}

@media (width <= 1440px) {
  .aiqa__footer {
    padding: 12px 6%;
  }
}

@media (width <= 1100px) {
  .aiqa__footer {
    padding: 12px 16px;
  }
}

.aiqa__chip {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 4px 10px;
  margin-bottom: 8px;
  font-size: 12px;
  color: rgba(0, 0, 0, 0.7);
  background: #eef4ff;
  border: 1px solid #cfdcff;
  border-radius: 999px;
}

.aiqa__chip-size {
  color: rgba(0, 0, 0, 0.4);
}

.aiqa__chip-x {
  margin-left: 4px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.aiqa__inputbox {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #fafbfc;
  border: 1px solid #e8edf5;
  border-radius: 12px;
  transition: border-color 0.2s ease;
}

.aiqa__inputbox:focus-within {
  background: #fff;
  border-color: #1677ff;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.08);
}

.aiqa__textarea {
  width: 100%;
  padding: 4px 4px 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(0, 0, 0, 0.85);
  resize: none;
  background: transparent;
  border: 0;
  outline: none;
}

.aiqa__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.aiqa__hint {
  margin-top: 6px;
  font-size: 11px;
  color: rgba(0, 0, 0, 0.4);
  text-align: center;
}
</style>
