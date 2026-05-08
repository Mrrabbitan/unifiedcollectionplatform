import { defineEventHandler, getRouterParam, readBody } from 'h3';

import { useResponseSuccess } from '~/utils/response';
import { addTask } from '~/utils/task-store';

/**
 * Mock 版「批量采集 - 结构化数据」任务创建接口
 *
 * 真实后端会把表单参数落库后返回新建的任务定义；
 * 这里通过 task-store 在内存里登记一条记录，
 * 这样 AI 助手「直接创建」与表单页「确认创建」两条路径
 * 提交完都能在「采集任务管理」列表里看到。
 */
export default defineEventHandler(async (event) => {
  const projectCode = Number(getRouterParam(event, 'code') ?? 0) || 0;
  const body = await readBody<Record<string, string>>(event);

  // 名称里如果带 pineapple_ 前缀，认为是 AI 走过来的（与 chat.post.ts 中
  // planTaskPayload 命名约定保持一致）；其它视为表单页提交。
  const isFromAi = (body?.name ?? '').startsWith('pineapple_');

  const item = addTask(projectCode, {
    name: body?.name ?? '',
    description: body?.description ?? '',
    timeout: Number(body?.timeout ?? 0) || 0,
    taskType: 'structuredBatch',
    source: body?.source,
    target: body?.target,
    fieldMapper: body?.fieldMapper,
    runConfig: body?.runConfig,
    origin: isFromAi ? 'ai' : 'form',
  });

  return useResponseSuccess({
    code: item.code,
    projectCode: item.projectCode,
    name: item.name,
    description: item.description,
    taskType: item.taskType,
    releaseState: item.releaseState,
    createTime: item.createTime,
    updateTime: item.updateTime,
  });
});
