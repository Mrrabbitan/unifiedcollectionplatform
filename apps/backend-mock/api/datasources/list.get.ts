import { defineEventHandler, getQuery } from 'h3';

import { useResponseSuccess } from '~/utils/response';

import { MOCK_DATASOURCES } from './_mock-data';

/**
 * Mock 版 GET /api/datasources/list?type=MYSQL
 *
 * 一些次级页面通过 `getDataSourceList(type)` 拉非分页数据源列表。
 * 这里直接返回过滤后的列表，去掉 metas 减小响应体积。
 */
export default defineEventHandler((event) => {
  const query = getQuery(event);
  const type = query.type ? String(query.type).toUpperCase() : '';
  const list = MOCK_DATASOURCES.filter((d) => !type || d.type === type).map(
    ({ metas: _m, ...rest }) => rest,
  );
  return useResponseSuccess(list);
});
