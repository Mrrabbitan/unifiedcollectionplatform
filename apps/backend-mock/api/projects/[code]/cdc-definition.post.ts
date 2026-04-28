import { defineEventHandler, getRouterParam, readBody } from 'h3';

import { useResponseSuccess } from '~/utils/response';

/**
 * Mock 版 CDC 实时采集任务创建接口（POST 表单）
 * AI 助手「直接创建」CDC 任务、streamcdc 表单页「确认创建」都会命中这里。
 */
export default defineEventHandler(async (event) => {
  const projectCode = Number(getRouterParam(event, 'code') ?? 0) || 0;
  const body = await readBody<Record<string, string>>(event);

  const taskCode = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

  return useResponseSuccess({
    code: taskCode,
    projectCode,
    name: body?.name ?? `mock_cdc_${taskCode}`,
    description: body?.description ?? '',
    taskType: 'streamCDC',
    releaseState: 'OFFLINE',
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString(),
  });
});
