import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * 当前选中的 API 上游：
 * - mock：所有 /api 请求转发到本地 Nitro mock（默认）
 * - prod：所有 /api 请求转发到 .env.development 里 VITE_GLOB_API_URL_PROD
 *         配置的生产环境（默认 http://10.177.64.38:8080/api）
 */
export type ApiEnv = 'mock' | 'prod';

export const API_ENV_LS_KEY = 'app:apiEnv';

function readInit(): ApiEnv {
  try {
    const value = localStorage.getItem(API_ENV_LS_KEY);
    return value === 'prod' ? 'prod' : 'mock';
  } catch {
    return 'mock';
  }
}

/**
 * 全局的「当前 API 上游」状态。
 *
 * 切换流程：写 localStorage → 同步给 Vite proxy（通过 X-Api-Env header）
 *           → location.reload() 让所有已发出的请求和缓存数据从干净状态重启。
 */
export const useApiEnvStore = defineStore('api-env', () => {
  const current = ref<ApiEnv>(readInit());

  function switchTo(target: ApiEnv) {
    if (target === current.value) return;
    try {
      localStorage.setItem(API_ENV_LS_KEY, target);
    } catch {
      // localStorage 不可用时仍允许切换（仅本次会话生效）
    }
    current.value = target;
    location.reload();
  }

  return { current, switchTo };
});
