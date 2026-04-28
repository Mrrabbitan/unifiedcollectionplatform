import { defineConfig } from '@vben/vite-config';
import { loadEnv } from 'vite';

export default defineConfig(async ({ mode }) => {
  // 读取 .env.development / .env 等里以 VITE_ 开头的环境变量
  const env = loadEnv(mode || 'development', process.cwd());

  // 默认本地 mock；生产上游默认 10.177.56.196:8087。
  // 可在 gitignored 的 .env.development.local 里设置 VITE_GLOB_API_URL_PROD
  // 覆盖（不要改已提交的 .env.development，避免 CI/secret 扫描误报）。
  const MOCK_TARGET = 'http://localhost:5320';
  const PROD_TARGET =
    env.VITE_GLOB_API_URL_PROD?.replace(/\/api\/?$/, '') ||
    'http://10.177.56.196:8087';

  return {
    application: {},
    vite: {
      server: {
        proxy: {
          // ============ 默认（本地 mock）通道 ============
          '/api': {
            changeOrigin: true,
            target: MOCK_TARGET,
            ws: true,
          },
          // ============ 生产环境通道 ============
          // 顶部「环境切换器」选生产时，请求拦截器会把 baseURL 从
          // /api 改写为 /__prod_api/api，进而命中这条 proxy 转到 10.177.64.38。
          //
          // 注：Vite 的 proxy 走原生 http-proxy，不支持按请求动态选 target，
          //   所以采用「两条静态 proxy + 拦截器改写 baseURL」这种成熟模式。
          '/__prod_api': {
            changeOrigin: true,
            target: PROD_TARGET,
            ws: true,
            rewrite: (path: string) => path.replace(/^\/__prod_api/, ''),
          },
        },
      },
    },
  };
});
