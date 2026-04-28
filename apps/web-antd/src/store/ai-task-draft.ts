import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { AiTaskPlan } from '#/layouts/widgets/ai-assistant/types';

/**
 * 跨页采集任务草稿：AI 助手解析后存到这里，
 * 用户跳到 structuredbatch / streamcdc 页面后读取一次再清空。
 */
export const useAiTaskDraftStore = defineStore('ai-task-draft', () => {
  const draft = ref<AiTaskPlan | null>(null);

  function setDraft(plan: AiTaskPlan) {
    draft.value = plan;
  }

  /** 一次性消费：取出后立即清空，避免下一次进入页面被覆盖 */
  function consumeDraft(taskType?: AiTaskPlan['taskType']): AiTaskPlan | null {
    if (!draft.value) return null;
    if (taskType && draft.value.taskType !== taskType) return null;
    const current = draft.value;
    draft.value = null;
    return current;
  }

  function clear() {
    draft.value = null;
  }

  return {
    draft,
    setDraft,
    consumeDraft,
    clear,
  };
});
