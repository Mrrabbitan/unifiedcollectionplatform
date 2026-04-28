import { defineEventHandler, getQuery } from 'h3';

import { useResponseSuccess } from '~/utils/response';

import { findDataSourceById } from './_mock-data';

/**
 * Mock 版 GET /api/datasources/metas?datasourceId=xxx
 *
 * `mysql-source-config.vue` 在选中数据源后调它取「该数据源下的表清单」，
 * 返回内每个 item 都包含 `tableName` 与 `columnsInfo`，后者用于推断主键。
 */
export default defineEventHandler((event) => {
  const query = getQuery(event);
  const datasourceId = Number(query.datasourceId ?? 0);
  const pageNo = Number(query.pageNo ?? 1) || 1;
  const pageSize = Number(query.pageSize ?? 100) || 100;

  const ds = findDataSourceById(datasourceId);
  const metas = ds?.metas ?? [];

  const start = (pageNo - 1) * pageSize;
  const end = start + pageSize;

  return useResponseSuccess({
    total: metas.length,
    totalPage: Math.max(1, Math.ceil(metas.length / pageSize)),
    currentPage: pageNo,
    pageNo,
    pageSize,
    totalList: metas.slice(start, end),
  });
});
