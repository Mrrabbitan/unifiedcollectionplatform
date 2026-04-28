import { requestClient } from '#/api/request';

export interface EnvironmentItem {
  code: number;
  name: string;
  config: string;
  description: string;
  workerGroups: string;
  createTime?: string;
  updateTime?: string;
}

export interface EnvironmentListRes {
  total: number;
  totalPage: number;
  currentPage: number;
  totalList: EnvironmentItem[];
}

export interface EnvironmentListParams {
  pageSize: number;
  pageNo: number;
  searchVal?: string;
}

export interface CreateEnvironmentParams {
  name: string;
  config: string;
  description?: string;
  workerGroups?: string;
}

export interface UpdateEnvironmentParams {
  code: number;
  name: string;
  config: string;
  description?: string;
  workerGroups?: string;
}

export function getEnvironmentList(params: EnvironmentListParams) {
  return requestClient.get<EnvironmentListRes>('/environment/list-paging', { params });
}

export function getEnvironmentAllList() {
  return requestClient.get<EnvironmentItem[]>('/environment/query-environment-list');
}

export function getEnvironmentByCode(environmentCode: number) {
  return requestClient.get<EnvironmentItem>('/environment/query-by-code', {
    params: { environmentCode },
  });
}

export function createEnvironment(data: CreateEnvironmentParams) {
  const params = new URLSearchParams();
  params.append('name', data.name);
  params.append('config', data.config);
  if (data.description) {
    params.append('description', data.description);
  } else {
    params.append('description', '');
  }
  if (data.workerGroups) {
    params.append('workerGroups', data.workerGroups);
  }
  return requestClient.post('/environment/create', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export function updateEnvironment(data: UpdateEnvironmentParams) {
  const params = new URLSearchParams();
  params.append('code', String(data.code));
  params.append('name', data.name);
  params.append('config', data.config);
  if (data.description) {
    params.append('description', data.description);
  } else {
    params.append('description', '');
  }
  if (data.workerGroups) {
    params.append('workerGroups', data.workerGroups);
  }
  return requestClient.post('/environment/update', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export function deleteEnvironment(environmentCode: number) {
  const params = new URLSearchParams();
  params.append('environmentCode', String(environmentCode));
  return requestClient.post('/environment/delete', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export function verifyEnvironment(environmentName: string) {
  const params = new URLSearchParams();
  params.append('environmentName', environmentName);
  return requestClient.post('/environment/verify-environment', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}
