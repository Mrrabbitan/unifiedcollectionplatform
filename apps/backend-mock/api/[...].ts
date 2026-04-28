import { defineEventHandler, getQuery } from 'h3';

import { useResponseSuccess } from '~/utils/response';

/**
 * 通用兜底：未显式定义的 /api/* 请求都会进入这里。
 * 目标：让前端各种列表/详情/写操作请求都能拿到"形状合理"的成功响应，
 * 不至于让页面抛错或卡 loading。
 *
 * 已显式实现的具体路由（如 /api/login、/api/users/get-user-info 等）
 * 会被 Nitro 优先匹配，本兜底只接管剩余请求。
 */
export default defineEventHandler(async (event) => {
  const method = event.method;
  const rawPath = event.path || '';
  const pathname = rawPath.split('?')[0] || rawPath;
  const query = getQuery(event);

  // 推断分页参数
  const hasPaging =
    'pageNo' in query || 'pageSize' in query || 'page' in query;
  const pageNo = Number(query.pageNo ?? query.page ?? 1) || 1;
  const pageSize = Number(query.pageSize ?? 10) || 10;

  // 写操作：POST/PUT/DELETE/PATCH 一律返回成功
  if (['DELETE', 'PATCH', 'POST', 'PUT'].includes(method)) {
    return useResponseSuccess(true);
  }

  // GET 请求：按 path 推断响应结构

  // 1) 分页查询 → 空分页对象（兼容多种结构字段名）
  if (hasPaging) {
    return useResponseSuccess({
      totalList: [],
      total: 0,
      totalPage: 0,
      currentPage: pageNo,
      pageNo,
      pageSize,
      items: [],
      list: [],
    });
  }

  // 2) 列表型路径 → 空数组
  //    覆盖：以 /list、/all、/list-paging、/options、-list、all-list 结尾
  if (
    /(\/list|\/all|\/list-paging|\/options|-list|all-list)$/i.test(pathname)
  ) {
    return useResponseSuccess([]);
  }

  // 3) 校验类（verify-xxx / xxx-exists / check-xxx）→ false
  if (/(verify|exists|check)([-/][^/]*)?$/i.test(pathname)) {
    return useResponseSuccess(false);
  }

  // 4) 计数 / 状态统计 → 0 或空结构
  if (/(count|state-count|status-count)$/i.test(pathname)) {
    return useResponseSuccess({
      totalCount: 0,
      waitingCount: 0,
      runningCount: 0,
      successCount: 0,
      failureCount: 0,
      pauseCount: 0,
      stopCount: 0,
      workflowInstanceStatusCounts: [],
    });
  }

  // 5) 其它 GET → null（详情接口前端通常会做空判定）
  return useResponseSuccess(null);
});
