import { requestClient } from '#/api/request';

import type {
  AiTaskCreationResult,
  AiTaskPlan,
} from '#/layouts/widgets/ai-assistant/types';

import {
  createCDCWorkflowDefinition,
  createStructuredBatchTask,
} from '#/api/taskmanagement';
import { useProjectStore } from '#/store';

interface ParseTaskRequirementResp {
  plan: AiTaskPlan;
}

/**
 * 把自然语言描述发到 mock 解析接口，拿到结构化的任务计划
 */
export async function parseTaskRequirement(
  text: string,
  context?: { datasourceTypes?: string[]; projectName?: string },
): Promise<AiTaskPlan> {
  const res = await requestClient.post<ParseTaskRequirementResp>(
    '/ai/parse-task',
    { text, context },
  );
  return res.plan;
}

/**
 * 直接根据 AI 计划落库一个最小可运行的采集任务（用于「直接创建」按钮）。
 *
 * 注意：mock 计划中并不一定提供完整字段（数据源、字段映射等），
 * 这里会用合理的默认值兜底，让真实后端 / mock 的 createXxx 接口能够走通；
 * 进入到「跳到表单」链路后再让用户精修。
 */
export async function applyPlanDirectly(
  plan: AiTaskPlan,
): Promise<AiTaskCreationResult> {
  const projectStore = useProjectStore();
  let projectCode = projectStore.currentProjectCode;

  // 自愈：刚登录或未触发过项目下拉时 currentProjectCode 可能为空。
  // 这里主动拉一次列表并选中第一个，避免直接创建被「未选择项目」拦下。
  if (!projectCode) {
    try {
      await projectStore.fetchProjectList();
      projectCode = projectStore.currentProjectCode;
    } catch {
      // 忽略，下面的兜底分支统一处理
    }
  }

  if (!projectCode) {
    return {
      ok: false,
      message: '尚未拿到可用项目，请在右上角选择一个项目后重试',
    };
  }

  if (plan.taskType === 'unsupported') {
    return {
      ok: false,
      message: '当前需求暂不支持自动创建，请手动配置或换一种描述方式',
    };
  }

  try {
    if (plan.taskType === 'structuredBatch') {
      const sourceData = {
        type: plan.source.type || 'MYSQL',
        datasourceId: plan.source.datasourceId ?? null,
        config: {
          database: plan.source.database || '',
          tables: (plan.source.tables ?? (plan.source.table ? [plan.source.table] : [])).map(
            (t) => ({ table_path: t, query: '' }),
          ),
        },
      };
      const targetData = {
        type: plan.target.type || 'MYSQL',
        datasourceId: plan.target.datasourceId ?? null,
        config: {
          database: plan.target.database || '',
          tables: plan.target.tables ?? (plan.target.table ? [plan.target.table] : []),
          tableNameMode: 'auto',
          dataSaveMode: 'APPEND_DATA',
        },
      };
      const fieldMapperData = {
        tableMappers: [
          {
            sourceTable:
              plan.source.table || plan.source.tables?.[0] || 'source_table',
            fieldMapper: plan.fieldMapping ?? {},
          },
        ],
      };

      await createStructuredBatchTask(projectCode, {
        name: plan.name,
        description: plan.description ?? '由 AI 助手自动生成',
        timeout: 0,
        globalParams: '[]',
        source: JSON.stringify(sourceData),
        target: JSON.stringify(targetData),
        fieldMapper: JSON.stringify(fieldMapperData),
        runConfig: JSON.stringify({}),
      });

      return {
        ok: true,
        message: `已创建批量采集任务「${plan.name}」`,
        link: '/collection/taskmanagement',
      };
    }

    if (plan.taskType === 'streamCDC') {
      const taskDataJson = JSON.stringify({
        source: {
          type: plan.source.type || 'MYSQL',
          datasourceId: plan.source.datasourceId ?? null,
          tableName: plan.source.table || '',
          config: {},
        },
        target: {
          type: plan.target.type || 'MYSQL',
          datasourceId: plan.target.datasourceId ?? null,
          tableName: plan.target.table || '',
          config: {},
        },
        fieldMapping: plan.fieldMapping ?? {},
        taskConfig: {
          jobName: plan.name,
          description: plan.description ?? '由 AI 助手自动生成',
          priority: 'MEDIUM',
          workerGroup: 'default',
          environment: 0,
          retryTimes: 0,
          retryInterval: 1,
          execStrategy: 'PARALLEL',
        },
        engineConfig: {
          engine: 'seatunnel.sh',
          deployMode: 'local',
          parallelism: 4,
          checkpointInterval: 30000,
          checkpointTimeout: 30000,
        },
      });

      await createCDCWorkflowDefinition(
        plan.name,
        plan.description ?? '由 AI 助手自动生成',
        '[]',
        '[]',
        0,
        '[]',
        '[]',
        'PARALLEL',
        taskDataJson,
      );

      return {
        ok: true,
        message: `已创建 CDC 实时采集任务「${plan.name}」`,
        link: '/collection/taskmanagement',
      };
    }

    return { ok: false, message: '未识别到可创建的任务类型' };
  } catch (error: any) {
    return {
      ok: false,
      message:
        error?.message ||
        '直接创建失败，可尝试改用「跳到表单确认」检查具体字段。',
    };
  }
}
