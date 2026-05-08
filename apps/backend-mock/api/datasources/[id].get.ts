import { defineEventHandler, getRouterParam } from 'h3';

import { useResponseError, useResponseSuccess } from '~/utils/response';

import { findDataSourceById } from './_mock-data';

/**
 * Mock 版 GET /api/datasources/:id
 *
 * `mysql-source-config.vue` / `mysql-target-config.vue` 在选中数据源时
 * 会调它取 `database` 字段并写到表单。
 */
export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id') ?? 0);
  const ds = findDataSourceById(id);
  if (!ds) {
    return useResponseError(`数据源不存在: ${id}`);
  }
  const { metas: _m, ...rest } = ds;
  return useResponseSuccess(rest);
});
