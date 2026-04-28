import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    password?: string;
    username?: string;
  }

  /** 登录接口返回值 */
  // export interface LoginResult {
  //   accessToken: string;
  // }

  export interface LoginResult {
    securityConfigType: string;
    sessionId: string;
  }
  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/**
 * 登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  const logresult = requestClient.postForm<AuthApi.LoginResult>('/login', data);
  console.log('loginApi:login result:', logresult);
  return logresult;
}

/**
 * 刷新accessToken
 */
export async function refreshTokenApi() {
  return baseRequestClient.post<AuthApi.RefreshTokenResult>('/refresh', {
    withCredentials: true,
  });
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return baseRequestClient.post('/signOut', {
    withCredentials: true,
  });
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  // return requestClient.get<string[]>('/codes');
  return [];
}
