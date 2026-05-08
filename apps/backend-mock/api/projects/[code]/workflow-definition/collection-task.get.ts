import { defineEventHandler, getQuery, getRouterParam } from 'h3';

import { useResponseSuccess } from '~/utils/response';
import { listTasks } from '~/utils/task-store';

/**
 * Mock 版「采集任务管理」列表接口
 *
 * 真实后端会从 DB 分页读取并返回 WorkflowListRes 形状；
 * 这里直接走 task-store。
 *
 * 之前没有这个文件时，请求会被根目录 `[...].ts` 兜底成空分页，
 * AI 自动建的任务因此看不到，本文件用来打通这一段。
 */
export default defineEventHandler((event) => {
  const projectCode = Number(getRouterParam(event, 'code') ?? 0) || 0;
  const query = getQuery(event);
  const result = listTasks(projectCode, {
    searchVal: typeof query.searchVal === 'string' ? query.searchVal : undefined,
    releaseState:
      typeof query.releaseState === 'string' ? query.releaseState : undefined,
    pageNo: Number(query.pageNo ?? query.page ?? 1) || 1,
    pageSize: Number(query.pageSize ?? 10) || 10,
  });
  return useResponseSuccess(result);
});
