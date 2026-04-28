import { defineEventHandler } from 'h3';

import { clearRefreshTokenCookie } from '~/utils/cookie-utils';
import { useResponseSuccess } from '~/utils/response';

export default defineEventHandler((event) => {
  clearRefreshTokenCookie(event);
  return useResponseSuccess(null);
});
