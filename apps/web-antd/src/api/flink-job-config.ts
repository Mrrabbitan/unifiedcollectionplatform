import { requestClient } from '#/api/request';

export interface FlinkJobConfigItem {
  id: number;
  resourceName: string;
  flinkVersion: string;
  jmMemory: number;
  tmMemory: number;
  submitMode: string;
  parallelism: number;
  slots: number;
  checkpointIntervalMs: number;
  checkpointTimeoutMs: number;
  queueName: string;
  checkpointDir: string;
  reserved1?: string;
  reserved2?: string;
  reserved3?: string;
  reserved4?: string;
  createTime?: string;
  updateTime?: string;
}

export interface FlinkJobConfigListRes {
  total: number;
  totalPage: number;
  currentPage: number;
  totalList: FlinkJobConfigItem[];
}

export interface FlinkJobConfigListParams {
  pageSize: number;
  pageNo: number;
  resourceName?: string;
}

export interface CreateFlinkJobConfigParams {
  resourceName: string;
  flinkVersion: string;
  jmMemory: number;
  tmMemory: number;
  submitMode: string;
  parallelism: number;
  slots: number;
  checkpointIntervalMs: number;
  checkpointTimeoutMs: number;
  queueName?: string;
  checkpointDir?: string;
}

export interface UpdateFlinkJobConfigParams extends CreateFlinkJobConfigParams {
  id: number;
}

export function getFlinkJobConfigList(params: FlinkJobConfigListParams) {
  return requestClient.get<FlinkJobConfigListRes | FlinkJobConfigItem[]>('/flink-job-config/page', { params });
}

export function getFlinkJobConfigAll() {
  return requestClient.get<FlinkJobConfigItem[]>('/flink-job-config/list');
}

export function getFlinkJobConfigById(id: number) {
  return requestClient.get<FlinkJobConfigItem>(`/flink-job-config/${id}`);
}

export function createFlinkJobConfig(data: CreateFlinkJobConfigParams) {
  return requestClient.post('/flink-job-config', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function updateFlinkJobConfig(data: UpdateFlinkJobConfigParams) {
  return requestClient.put('/flink-job-config', data, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

export function deleteFlinkJobConfig(id: number) {
  return requestClient.delete(`/flink-job-config/${id}`);
}
