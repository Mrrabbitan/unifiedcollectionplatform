import { defineEventHandler, getQuery } from 'h3';

import { useResponseSuccess } from '~/utils/response';

import { MOCK_DATASOURCES } from './_mock-data';

/**
 * Mock 版 GET /api/datasources
 *
 * 前端通过 `getDataSourceListApi(pageNo, pageSize, searchVal)` 调它，
 * 表单页会按 `type === 'MYSQL'` 过滤后塞进源/目标下拉。
 *
 * 这里返回的 totalList 中包含 host=10.177.64.38 与 name=zb_cjzh_realtime
 * 两条 MYSQL 数据源，AI 助手回填后下拉里能直接命中。
 */
export default defineEventHandler((event) => {
  const query = getQuery(event);
  const pageNo = Number(query.pageNo ?? 1) || 1;
  const pageSize = Number(query.pageSize ?? 10) || 10;
  const searchVal = String(query.searchVal ?? '').trim().toLowerCase();
  const type = query.type ? String(query.type).toUpperCase() : '';

  const filtered = MOCK_DATASOURCES.filter((d) => {
    if (type && d.type !== type) return false;
    if (!searchVal) return true;
    return (
      d.name.toLowerCase().includes(searchVal) ||
      d.host.toLowerCase().includes(searchVal) ||
      d.database.toLowerCase().includes(searchVal)
    );
  });

  const start = (pageNo - 1) * pageSize;
  const end = start + pageSize;
  const totalList = filtered.slice(start, end).map(({ metas: _m, ...rest }) => rest);

  return useResponseSuccess({
    total: filtered.length,
    totalPage: Math.max(1, Math.ceil(filtered.length / pageSize)),
    currentPage: pageNo,
    pageNo,
    pageSize,
    totalList,
  });
});
