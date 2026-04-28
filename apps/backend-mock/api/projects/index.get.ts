import { defineEventHandler, getQuery } from 'h3';

import { useResponseSuccess } from '~/utils/response';

/**
 * Mock 版分页 /api/projects
 * 项目下拉、`projectStore.fetchProjectList` 都依赖它返回的 totalList。
 * 这里给一条「示例项目 1001」让前端默认选中，
 * 否则 currentProjectCode 会一直是 undefined，
 * 进而所有 /projects/{code}/... 写操作都会被前端拦在「未选择项目」校验。
 */
export default defineEventHandler((event) => {
  const query = getQuery(event);
  const pageNo = Number(query.pageNo ?? 1) || 1;
  const pageSize = Number(query.pageSize ?? 10) || 10;

  const projects = [
    {
      code: 1001,
      name: '示例项目',
      userName: 'admin',
      userId: 1,
      description: 'mock 项目，用于本地走通采集任务全链路',
      defCount: 3,
      createTime: '2025-01-01 00:00:00',
      updateTime: '2025-01-01 00:00:00',
    },
  ];

  return useResponseSuccess({
    total: projects.length,
    totalPage: 1,
    currentPage: pageNo,
    pageNo,
    pageSize,
    totalList: projects,
  });
});
