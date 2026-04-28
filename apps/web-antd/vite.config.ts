import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            // 本地 Nitro Mock 服务，路由保留 /api 前缀
            target: 'http://localhost:5320',
            ws: true,
          },
        },
      },
    },
  };
});
