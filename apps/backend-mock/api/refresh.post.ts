import { defineEventHandler } from 'h3';

import { useResponseSuccess } from '~/utils/response';

export default defineEventHandler(() => {
  return useResponseSuccess({
    data: `mock-refresh-${Date.now()}`,
    status: 0,
  });
});
