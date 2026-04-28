import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { applyPlanDirectly, parseTaskRequirement } from '#/api/ai-assistant';
import { useAiTaskDraftStore } from '#/store/ai-task-draft';

import type { AiAssistantMessage, AiTaskPlan } from '../types';

/**
 * 全局单例的 AI 助手状态：消息流、面板开关、解析与落库动作。
 * 通过 module 级 ref 让浮球与面板共享状态，避免 props 透传。
 */
const isOpen = ref(false);
const isPending = ref(false);
const unread = ref(0);
const messages = ref<AiAssistantMessage[]>([
  {
    id: 'welcome',
    role: 'assistant',
    content:
      '你好，我是 AI 采集助手。你可以用一句话描述你的采集需求，我会帮你自动生成采集任务。\n\n示例：\n- 创建一个从 MySQL 到 MaxCompute 的每日批量同步任务\n- 实时同步 MySQL binlog 到 PostgreSQL\n- 6836946 这个故事，把 user 表实时同步到目标库',
    timestamp: Date.now(),
    status: 'success',
  },
]);

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 把 plan 里"我们能拿来填表单"的字段拍平成展示用的中文字符串列表，
 * 用于跳转前在聊天里给出"我已经帮你填了 N 项"的回执。
 */
function collectFilledFields(plan: AiTaskPlan): string[] {
  const items: string[] = [];
  if (plan.name) items.push(`任务名 ${plan.name}`);
  if (plan.source?.type) {
    const ds = plan.source.datasourceName || plan.source.datasourceHost;
    items.push(`源端 ${plan.source.type}${ds ? ` / ${ds}` : ''}`);
  }
  if (plan.source?.tables?.length) {
    items.push(`源表 ${plan.source.tables.join(', ')}`);
  } else if (plan.source?.table) {
    items.push(`源表 ${plan.source.table}`);
  }
  if (plan.target?.type) {
    const ds = plan.target.datasourceName || plan.target.datasourceHost;
    items.push(`目标端 ${plan.target.type}${ds ? ` / ${ds}` : ''}`);
  }
  if (plan.target?.tableNameMode === 'auto') items.push('目标表 自动建表');
  else if (plan.target?.tableNameMode === 'select') items.push('目标表 已有表');
  if (plan.target?.dataSaveMode === 'APPEND_DATA') items.push('保存模式 追加数据');
  else if (plan.target?.dataSaveMode === 'DROP_DATA') items.push('保存模式 覆盖数据');
  if (plan.runConfig?.runMode) items.push(`运行模式 ${plan.runConfig.runMode}`);
  if (plan.runConfig?.flinkJobConfigName) {
    items.push(`资源配置 ${plan.runConfig.flinkJobConfigName}`);
  }
  if (plan.schedule?.mode) items.push(`调度 ${plan.schedule.mode}`);
  return items;
}

export function useAiAssistant() {
  const router = useRouter();
  const draftStore = useAiTaskDraftStore();

  const hasMessages = computed(() => messages.value.length > 1);

  function openPanel() {
    isOpen.value = true;
    unread.value = 0;
  }

  function closePanel() {
    isOpen.value = false;
  }

  function togglePanel() {
    if (isOpen.value) closePanel();
    else openPanel();
  }

  function pushUser(text: string) {
    messages.value.push({
      id: uid(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
      status: 'success',
    });
  }

  function pushAssistant(payload: Partial<AiAssistantMessage>) {
    const message: AiAssistantMessage = {
      id: uid(),
      role: 'assistant',
      content: payload.content ?? '',
      plan: payload.plan,
      status: payload.status ?? 'success',
      timestamp: Date.now(),
    };
    messages.value.push(message);
    if (!isOpen.value) {
      unread.value += 1;
    }
    return message;
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isPending.value) return;

    pushUser(trimmed);
    isPending.value = true;

    const pendingMsg: AiAssistantMessage = {
      id: uid(),
      role: 'assistant',
      content: '正在思考...',
      timestamp: Date.now(),
      status: 'pending',
    };
    messages.value.push(pendingMsg);

    try {
      const plan = await parseTaskRequirement(trimmed);
      const idx = messages.value.findIndex((m) => m.id === pendingMsg.id);
      if (idx >= 0) {
        messages.value[idx] = {
          ...pendingMsg,
          content: plan.summary,
          plan,
          status: 'success',
        };
      }
      if (!isOpen.value) {
        unread.value += 1;
      }
      return plan;
    } catch (error: any) {
      const idx = messages.value.findIndex((m) => m.id === pendingMsg.id);
      const errMsg = error?.message || '解析失败，请稍后再试';
      if (idx >= 0) {
        messages.value[idx] = {
          ...pendingMsg,
          content: `解析失败：${errMsg}`,
          status: 'error',
        };
      }
      throw error;
    } finally {
      isPending.value = false;
    }
  }

  /** 跳转到对应任务表单页并自动回填 */
  function applyPlanToForm(plan: AiTaskPlan) {
    if (plan.taskType === 'unsupported') {
      pushAssistant({
        content: '当前需求暂未匹配到可用的采集任务类型，请尝试切换描述。',
        status: 'error',
      });
      return;
    }

    const fields = collectFilledFields(plan);
    const summaryLines = ['已为你打开任务表单，并预填以下字段：'];
    if (fields.length > 0) {
      summaryLines.push(...fields.map((f) => `· ${f}`));
    } else {
      summaryLines.push('· 暂未识别到具体字段，请在表单内补充');
    }
    if (plan.missing && plan.missing.length > 0) {
      summaryLines.push(
        '',
        `仍需补充：${plan.missing.join('、')}`,
      );
    }
    pushAssistant({
      content: summaryLines.join('\n'),
      status: 'success',
    });

    draftStore.setDraft(plan);
    closePanel();
    const target =
      plan.taskType === 'streamCDC'
        ? '/collection/streamcdc'
        : '/collection/structuredbatch';
    router.push({ path: target, query: { fromAi: '1' } });
  }

  /** 直接调用现有创建接口落库 */
  async function applyPlanDirect(plan: AiTaskPlan) {
    if (isPending.value) return;
    isPending.value = true;
    pushAssistant({
      content: `正在为你直接创建任务「${plan.name}」...`,
      status: 'pending',
    });
    try {
      const result = await applyPlanDirectly(plan);
      pushAssistant({
        content: result.ok
          ? `${result.message}\n你可以前往「采集任务管理」查看详情。`
          : `创建失败：${result.message}`,
        status: result.ok ? 'success' : 'error',
      });
      if (result.ok && result.link) {
        return { ok: true, link: result.link };
      }
      return result;
    } finally {
      isPending.value = false;
    }
  }

  function reset() {
    messages.value = messages.value.slice(0, 1);
    unread.value = 0;
  }

  return {
    isOpen,
    isPending,
    unread,
    messages,
    hasMessages,
    openPanel,
    closePanel,
    togglePanel,
    sendMessage,
    applyPlanToForm,
    applyPlanDirect,
    reset,
  };
}
