/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
    withCredentials: true, 
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Session expired or invalid. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑
   */
  async function doRefreshToken() {
    // const accessStore = useAccessStore();
    // const resp = await refreshTokenApi();
    // const newToken = resp.data;
    // accessStore.setAccessToken(newToken);
    // return newToken;
    return Promise.resolve(null);
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      // const accessStore = useAccessStore();
      // config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      config.headers['Language'] = preferences.app.locale;
      // 顶部「环境切换器」决定的当前上游：mock / prod
      // 这里直读 localStorage 而不是 useApiEnvStore()，因为 request.ts
      // 在 Pinia 初始化前就被某些 setup-script 引用，避免循环依赖。
      let apiEnv: 'mock' | 'prod' = 'mock';
      try {
        if (
          typeof localStorage !== 'undefined' &&
          localStorage.getItem('app:apiEnv') === 'prod'
        ) {
          apiEnv = 'prod';
        }
      } catch {
        apiEnv = 'mock';
      }
      config.headers['X-Api-Env'] = apiEnv;
      // 选择 prod 时，把 baseURL 从 /api 改写为 /__prod_api/api。
      // 该前缀对应 vite.config.ts 里 /__prod_api proxy → 10.177.64.38:8080，
      // rewrite 会再把前缀剥掉，所以上游收到的仍是 /api/...
      if (apiEnv === 'prod' && config.baseURL === '/api') {
        config.baseURL = '/__prod_api/api';
      }
      return config;
    },
  });

  // 处理返回的响应数据格式
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );

  // token过期的处理
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // 这里可以根据业务进行定制,你可以拿到 error 内的信息进行定制化处理，根据不同的 code 做不同的提示，而不是直接使用 message.error 提示 msg
      // 当前mock接口返回的错误字段是 error 或者 message
      const responseData = error?.response?.data ?? {};
      const errorMessage = responseData?.error ?? responseData?.msg ?? '';
      // 如果没有错误信息，则会根据状态码进行提示
      message.error(errorMessage || msg);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL, withCredentials: true, });
