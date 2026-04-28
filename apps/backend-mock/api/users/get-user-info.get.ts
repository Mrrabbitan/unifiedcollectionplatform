import { defineEventHandler } from 'h3';

import { useResponseSuccess } from '~/utils/response';

/**
 * Mock 版 /api/users/get-user-info
 * 字段尽量覆盖 dolphinscheduler 与 vben 两套 UserInfo 的并集，
 * 避免前端读字段时 undefined。
 */
export default defineEventHandler(() => {
  return useResponseSuccess({
    id: 1,
    userId: 1,
    userName: 'admin',
    realName: 'Admin',
    userType: 'ADMIN_USER',
    email: 'admin@example.com',
    phone: '13800000000',
    tenantId: 1,
    tenantCode: 'default',
    queue: 'default',
    queueName: 'default',
    state: 1,
    timeZone: 'Asia/Shanghai',
    homePath: '/home/index',
    roles: ['super'],
    permissions: [],
    avatar: '',
    desc: 'manager',
    createTime: '2025-01-01 00:00:00',
    updateTime: '2025-01-01 00:00:00',
  });
});
