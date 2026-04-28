import { defineEventHandler, readBody } from 'h3';

import { setRefreshTokenCookie } from '~/utils/cookie-utils';
import { useResponseSuccess } from '~/utils/response';

/**
 * Mock 版 /api/login（dolphinscheduler 风格）
 * - 接收任意账号密码（form-encoded 或 JSON）
 * - 返回 sessionId 和 securityConfigType
 */
export default defineEventHandler(async (event) => {
  let userName = 'admin';
  try {
    const body = await readBody(event);
    if (body && typeof body === 'object') {
      userName = body.userName || body.username || userName;
    }
  } catch {
    // ignore
  }

  const sessionId = `mock-session-${Date.now()}`;
  setRefreshTokenCookie(event, sessionId);

  return useResponseSuccess({
    sessionId,
    securityConfigType: 'NONE',
    userName,
  });
});
