import { requestClient } from '#/api/request';

export interface WorkflowInstanceItem {
  id: number;
  name: string;
  state: string;
  commandType: string;
  scheduleTime: string;
  startTime: string;
  endTime: string;
  duration: string;
  runTimes: number;
  executorName: string;
  host: string;
  workflowDefinitionCode: number;
  projectCode: number;
}

export interface WorkflowInstanceListRes {
  totalList: WorkflowInstanceItem[];
  total: number;
  totalPage: number;
  pageSize: number;
  currentPage: number;
  pageNo: number;
}

export interface WorkflowInstanceListParams {
  pageNo: number;
  pageSize: number;
  workflowDefinitionCode?: number;
  searchVal?: string;
  executorName?: string;
  host?: string;
  stateType?: string;
  startDate?: string;
  endDate?: string;
}

export interface StateCountParams {
  workflowDefinitionCode?: number;
  searchVal?: string;
  executorName?: string;
  host?: string;
  stateType?: string;
  startDate?: string;
  endDate?: string;
}

export interface StateCountItem {
  state: string;
  count: number;
}

export interface StateCountRes {
  totalCount: number;
  workflowInstanceStatusCounts: StateCountItem[];
}

export function getWorkflowInstanceStateCount(
  projectCode: number,
  params?: StateCountParams,
) {
  return requestClient.get<StateCountRes>(
    `/projects/${projectCode}/workflow-instances/collection-task-instances/state-count`,
    { params },
  );
}

export function getWorkflowInstanceList(
  projectCode: number,
  params: WorkflowInstanceListParams,
) {
  return requestClient.get<WorkflowInstanceListRes>(
    `/projects/${projectCode}/workflow-instances/collection-task-instances`,
    { params },
  );
}

export interface ResponseTaskLog {
  lineNum: number;
  message: string;
}

export interface LogDetailParams {
  taskInstanceId: number;
  limit: number;
  skipLineNum: number;
}

export function getLogDetail(params: LogDetailParams) {
  return requestClient.get<ResponseTaskLog>('/log/detail', { params });
}

export interface WorkflowLogDetailParams {
  workflowInstanceId: number;
  limit: number;
  skipLineNum: number;
}

export function getWorkflowLogDetail(params: WorkflowLogDetailParams) {
  return requestClient.get<string>('/log/workflow-detail', { params });
}

export function forceSuccess(projectCode: number, taskInstanceId: number) {
  return requestClient.post(
    `/projects/${projectCode}/task-instances/${taskInstanceId}/force-success`,
  );
}

export interface ExecuteParams {
  executeType: 'REPEAT_RUNNING' | 'STOP' | 'PAUSE' | 'RECOVER_SUSPENDED_PROCESS' | 'START_FAILURE_TASK_PROCESS';
  workflowInstanceId: number;
}

export function execute(projectCode: number, params: ExecuteParams) {
  return requestClient.post(
    `/projects/${projectCode}/executors/execute`,
    null,
    { params },
  );
}

export function deleteWorkflowInstance(projectCode: number, workflowInstanceId: number) {
  return requestClient.delete(
    `/projects/${projectCode}/workflow-instances/${workflowInstanceId}`,
  );
}
