import { defineEventHandler, getRouterParam, readBody } from 'h3';

import { useResponseSuccess } from '~/utils/response';

/**
 * Mock 版「批量采集 - 结构化数据」任务创建接口
 * 真实后端会把表单参数落库后返回新建的任务定义；
 * 这里只确保前端 await 能拿到一份合理的成功响应，
 * AI 助手「直接创建」与表单页「确认创建」都会落到这里。
 */
export default defineEventHandler(async (event) => {
  const projectCode = Number(getRouterParam(event, 'code') ?? 0) || 0;
  const body = await readBody<Record<string, string>>(event);

  const taskCode = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

  return useResponseSuccess({
    code: taskCode,
    projectCode,
    name: body?.name ?? `mock_structured_batch_${taskCode}`,
    description: body?.description ?? '',
    taskType: 'structuredBatch',
    releaseState: 'OFFLINE',
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString(),
  });
});
