import { defineEventHandler } from 'h3';

import { useResponseSuccess } from '~/utils/response';

/**
 * Mock 版 /api/projects/list
 * 为路由守卫挑选 currentProject 提供一条示例记录，
 * userId 与 /api/users/get-user-info 的 id 保持一致。
 */
export default defineEventHandler(() => {
  return useResponseSuccess([
    {
      code: 1001,
      name: '示例项目',
      userName: 'admin',
      userId: 1,
      description: 'mock 项目',
      defCount: 3,
      createTime: '2025-01-01 00:00:00',
      updateTime: '2025-01-01 00:00:00',
    },
  ]);
});
