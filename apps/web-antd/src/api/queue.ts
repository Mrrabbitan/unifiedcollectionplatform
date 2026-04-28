import { requestClient } from '#/api/request';

export interface QueueItem {
  id: number;
  queue: string;
  queueName: string;
  createTime?: string;
  updateTime?: string;
}

export interface QueueListRes {
  total: number;
  totalPage: number;
  currentPage: number;
  totalList: QueueItem[];
}

export interface QueueListParams {
  pageSize: number;
  pageNo: number;
  searchVal?: string;
}

export interface CreateQueueParams {
  queue: string;
  queueName: string;
}

export interface UpdateQueueParams {
  id: number;
  queue: string;
  queueName: string;
}

export function getQueueList(params: QueueListParams) {
  return requestClient.get<QueueListRes>('/queues', { params });
}

export function getQueueAllList() {
  return requestClient.get<QueueItem[]>('/queues/list');
}

export function createQueue(data: CreateQueueParams) {
  const params = new URLSearchParams();
  params.append('queue', data.queue);
  params.append('queueName', data.queueName);
  return requestClient.post('/queues', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export function updateQueue(data: UpdateQueueParams) {
  const params = new URLSearchParams();
  params.append('queue', data.queue);
  params.append('queueName', data.queueName);
  return requestClient.put(`/queues/${data.id}`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export function deleteQueue(id: number) {
  return requestClient.delete(`/queues/${id}`);
}

export function verifyQueue(data: CreateQueueParams) {
  const params = new URLSearchParams();
  params.append('queue', data.queue);
  params.append('queueName', data.queueName);
  return requestClient.post('/queues/verify', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}
