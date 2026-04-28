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
