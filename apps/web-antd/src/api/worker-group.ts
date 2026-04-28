import { requestClient } from '#/api/request';

export interface WorkerGroupItem {
  id: number;
  name: string;
  addrList: string;
  description: string;
  createTime?: string;
  updateTime?: string;
}

export interface WorkerGroupListRes {
  total: number;
  totalPage: number;
  currentPage: number;
  totalList: WorkerGroupItem[];
}

export interface WorkerGroupListParams {
  pageSize: number;
  pageNo: number;
  searchVal?: string;
}

export interface CreateWorkerGroupParams {
  id?: number;
  name: string;
  addrList: string;
  description?: string;
}

export function getWorkerGroupList(params: WorkerGroupListParams) {
  return requestClient.get<WorkerGroupListRes>('/worker-groups', { params });
}

export function getWorkerGroupAllList() {
  return requestClient.get<WorkerGroupItem[]>('/worker-groups/all');
}

export function getWorkerAddressList() {
  return requestClient.get<string[]>('/worker-groups/worker-address-list');
}

export function createWorkerGroup(data: CreateWorkerGroupParams) {
  const params = new URLSearchParams();
  if (data.id) {
    params.append('id', String(data.id));
  } else {
    params.append('id', '0');
  }
  params.append('name', data.name);
  params.append('addrList', data.addrList);
  if (data.description) {
    params.append('description', data.description);
  } else {
    params.append('description', '');
  }
  return requestClient.post('/worker-groups', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export function deleteWorkerGroup(id: number) {
  return requestClient.delete(`/worker-groups/${id}`);
}
