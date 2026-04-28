import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

import type { TenantInfo, QueueInfo, UserInfo as DsUserInfo } from '#/types/tenant/tenant'

import type { PageInfo } from '#/types/page'

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo>('/users/get-user-info');
}

export async function getTenantInfoApi(pageSize: number, pageNo: number, searchVal: string) {
  const result = requestClient.get<PageInfo<TenantInfo>>('/tenants', 
                                              { params: { pageSize: pageSize, pageNo: pageNo, searchVal: searchVal }});
  return result;
}

export async function getQueueInfoApi() {
  const result = requestClient.get<QueueInfo[]>('/queues/list');
  return result;
}

export async function getTenantInfoList() {
  return requestClient.get<TenantInfo[]>('/tenants/list');
}

export async function getQueueInfoList() {
  return requestClient.get<QueueInfo[]>('/queues/list');
}

export async function updateTenantInfoApi(tenantInfo: TenantInfo) {
  return requestClient.putForm<Boolean>(`/tenants/${tenantInfo.id}`, {
    tenantCode: tenantInfo.tenantCode, queueId: tenantInfo.queueId, description: tenantInfo.description,
  });
}

export async function createTenantInfoApi(tenantInfo: TenantInfo) {
  console.log("createTenantInfoApi:", tenantInfo);
  return requestClient.postForm<Boolean>('/tenants', {
    tenantCode: tenantInfo.tenantCode, queueId: tenantInfo.queueId, description: tenantInfo.description,
  });
}

export async function deleteTenantInfoApi(id: number) {
  return requestClient.delete<null>(`/tenants/${id}`);
}

export async function getUserApi(pageSize: number, pageNo: number, searchVal: string) {
  return requestClient.get<PageInfo<DsUserInfo>>('/users/list-paging', {
    params: { pageSize, pageNo, searchVal },
  });
}

export async function createUserApi(userInfo: DsUserInfo) {
  return requestClient.postForm<Boolean>('/users/create-with-user-type', {
    userName: userInfo.userName,
    userPassword: userInfo.userPassword,
    userType: userInfo.userType,
    email: userInfo.email,
    phone: userInfo.phone,
    tenantId: userInfo.tenantId,
    queue: userInfo.queue,
    state: userInfo.state,
    timeZone: userInfo.timeZone,
    homePath: userInfo.homePath,
  });
}

export async function updateUserApi(userInfo: DsUserInfo) {
  return requestClient.postForm<DsUserInfo>('/users/update-with-user-type', {
    id: userInfo.id,
    userName: userInfo.userName,
    userPassword: userInfo.userPassword || '',
    userType: userInfo.userType,
    queue: userInfo.queue || '',
    email: userInfo.email,
    tenantId: userInfo.tenantId,
    phone: userInfo.phone || '',
    state: userInfo.state ?? 1,
    timeZone: userInfo.timeZone || '',
    homePath: userInfo.homePath || '',
  });
}

export async function deleteUserApi(id: number) {
  return requestClient.postForm<null>('/users/delete', { id });
}

export interface ProjectWithAuth {
  id: number;
  name: string;
  code: number;
  perm: number;
}

export interface ProjectAuthListRes {
  totalList: ProjectWithAuth[];
  total: number;
}

export async function getProjectWithAuthListApi(userId: number, pageNo: number, pageSize: number, searchVal?: string) {
  return requestClient.get<ProjectAuthListRes>('/projects/project-with-authorized-level-list-paging', {
    params: { userId, pageNo, pageSize, searchVal },
  });
}

export async function grantProjectApi(userId: number, projectIds: string) {
  return requestClient.postForm<null>('/users/grant-project', { userId, projectIds });
}

export async function revokeProjectByIdApi(userId: number, projectIds: string) {
  return requestClient.postForm<null>('/users/revoke-project-by-id', { userId, projectIds });
}

export interface DataSourceAuthItem {
  id: number;
  name: string;
  type: string;
}

export async function getAuthedDataSourceApi(userId: number) {
  return requestClient.get<DataSourceAuthItem[]>('/datasources/authed-datasource', {
    params: { userId },
  });
}

export async function getUnauthDataSourceApi(userId: number) {
  return requestClient.get<DataSourceAuthItem[]>('/datasources/unauth-datasource', {
    params: { userId },
  });
}

export async function grantDataSourceApi(userId: number, datasourceIds: string) {
  return requestClient.postForm<null>('/users/grant-datasource', { userId, datasourceIds });
}

