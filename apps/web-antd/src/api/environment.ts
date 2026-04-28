import { requestClient } from '#/api/request';

export interface EnvironmentInfo {
  id: number;
  code: number;
  name: string;
  config: string;
  description: string;
  workerGroups: string[];
  operator: number;
  createTime: string;
  updateTime: string;
}

export async function getEnvironmentListApi() {
  return requestClient.get<EnvironmentInfo[]>('/environment/query-environment-list');
}
