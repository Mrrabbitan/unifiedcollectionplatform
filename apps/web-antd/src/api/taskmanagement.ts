import { requestClient } from '#/api/request';
import type { TaskDefinition, TaskData } from '#/api/cdc';
import { useProjectStore } from '@vben/stores';

export interface ScheduleInfo {
  id: number;
  workflowDefinitionCode: number;
  workflowDefinitionName: string | null;
  projectName: string | null;
  definitionDescription: string | null;
  startTime: string;
  endTime: string;
  timezoneId: string;
  crontab: string;
  failureStrategy: string;
  warningType: string;
  createTime: string;
  updateTime: string;
  userId: number;
  userName: string | null;
  releaseState: string;
  warningGroupId: number;
  workflowInstancePriority: string;
  workerGroup: string;
  tenantCode: string;
  environmentCode: number;
  environmentName: string | null;
}

export interface WorkflowItem {
  id: number;
  code: number;
  name: string;
  version: number;
  releaseState: string;
  projectCode: number;
  description: string;
  globalParams: string;
  globalParamList: any[];
  globalParamMap: Record<string, any>;
  createTime: string;
  updateTime: string;
  flag: string;
  userId: number;
  userName: string;
  projectName: string | null;
  locations: string;
  scheduleReleaseState: string | null;
  schedule: ScheduleInfo | null;
  timeout: number;
  modifyBy: string;
  warningGroupId: number | null;
  executionType: string;
  taskType?: 'structuredBatch' | 'unStructuredBatch' | 'stream' | 'streamCDC';
}

export interface WorkflowListRes {
  totalList: WorkflowItem[];
  total: number;
  totalPage: number;
  pageSize: number;
  currentPage: number;
  pageNo: number;
}

export interface WorkflowListParams {
  searchVal?: string;
  releaseState?: string;
  pageNo: number;
  pageSize: number;
}

export function getWorkflowList(projectCode: number, params: WorkflowListParams) {
  return requestClient.get<WorkflowListRes>(
    `/projects/${projectCode}/workflow-definition/collection-task`,
    { params },
  );
}

export function getTaskCodeList() {
  const projectStore = useProjectStore();
  const projectCode = projectStore.currentProject?.code || 0;
  const genNum:number = 1
  return requestClient.get<number[]>(`/projects/${projectCode}/task-definition/gen-task-codes`, 
    { params: { genNum } });
}
export function createWorkflowDefinition(name: string, 
                                         description: string, 
                                         globalParams: string,
                                         locations: string,
                                         timeout: number,
                                         taskRelationJson: string,
                                         taskDefinitionJson: string,
                                         executionType: string) {
  const projectStore = useProjectStore();
  const projectCode = projectStore.currentProject?.code || 0;
  return requestClient.postForm<TaskDefinition>(`/projects/${projectCode}/workflow-definition/collection-task`, {
    name, description, globalParams, locations, timeout, taskRelationJson, taskDefinitionJson, executionType
  }); 
}

export function createCDCWorkflowDefinition(name: string, 
                                         description: string, 
                                         globalParams: string,
                                         locations: string,
                                         timeout: number,
                                         taskRelationJson: string,
                                         taskDefinitionJson: string,
                                         executionType: string,
                                         taskDataJson: string) {
  const projectStore = useProjectStore();
  const projectCode = projectStore.currentProject?.code || 0;
  return requestClient.postForm<TaskDefinition>(`/projects/${projectCode}/cdc-definition`, {
    name, description, globalParams, 
    locations, timeout, taskRelationJson, 
    taskDefinitionJson, executionType, taskDataJson
  }); 
}

export function updateCDCWorkflowDefinition(name: string, 
                                         code: number,
                                         description: string, 
                                         globalParams: string,
                                         locations: string,
                                         timeout: number,
                                         taskRelationJson: string,
                                         taskDefinitionJson: string,
                                         executionType: string,
                                         taskDataJson: string) {
  const projectStore = useProjectStore();
  const projectCode = projectStore.currentProject?.code || 0;
  return requestClient.putForm<TaskDefinition>(`/projects/${projectCode}/cdc-definition`, {
    name, code, description, globalParams, 
    locations, timeout, taskRelationJson, 
    taskDefinitionJson, executionType, taskDataJson
  }); 
}

export function getWorkflowStreamCDCData(projectCode: number, workflowCode: number) {
  return requestClient.get<TaskData>(
    `/projects/${projectCode}/cdc-definition/${workflowCode}`,
  );
}

export interface VerifyNameResponse {
  code: number;
  msg: string;
  data: null;
  failed: boolean;
  success: boolean;
}

export function verifyWorkflowName(projectCode: number, name: string) {
  return requestClient.get<VerifyNameResponse>(
    `/projects/${projectCode}/workflow-definition/verify-name`,
    { params: { name } },
  );
}

export interface StructuredBatchTaskParams {
  description?: string;
  timeout?: number;
  [key: string]: any;
}

export function createStructuredBatchTask(projectCode: number, data: StructuredBatchTaskParams) {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return requestClient.post(
    `/projects/${projectCode}/structured-batch-task/create-structured-batch`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export function updateWorkflowTask(projectCode: number, workflowCode: number, data: StructuredBatchTaskParams) {
  const params = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  });
  return requestClient.put(
    `/projects/${projectCode}/structured-batch-task/update-structured-batch/${workflowCode}`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export interface ReleaseWorkflowParams {
  name: string;
  releaseState: 'ONLINE' | 'OFFLINE';
}

export function releaseWorkflow(projectCode: number, workflowCode: number, params: ReleaseWorkflowParams) {
  const formData = new URLSearchParams();
  formData.append('name', params.name);
  formData.append('releaseState', params.releaseState);
  return requestClient.post(
    `/projects/${projectCode}/workflow-definition/${workflowCode}/release`,
    formData,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export interface SchedulePreviewParams {
  startTime: string;
  endTime: string;
  crontab: string;
  timezoneId: string;
}

export function previewSchedule(projectCode: number, schedule: SchedulePreviewParams) {
  const formData = new URLSearchParams();
  formData.append('schedule', JSON.stringify(schedule));
  return requestClient.post<string[]>(
    `/projects/${projectCode}/schedules/preview`,
    formData,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export interface CreateScheduleParams {
  schedule: SchedulePreviewParams;
  failureStrategy: string;
  warningType: string;
  workflowInstancePriority: string;
  warningGroupId: number;
  workerGroup: string;
  tenantCode: string;
  environmentCode: number;
  workflowDefinitionCode: number;
}

export function createSchedule(projectCode: number, params: CreateScheduleParams) {
  const formData = new URLSearchParams();
  formData.append('schedule', JSON.stringify(params.schedule));
  formData.append('failureStrategy', params.failureStrategy);
  formData.append('warningType', params.warningType);
  formData.append('workflowInstancePriority', params.workflowInstancePriority);
  formData.append('warningGroupId', String(params.warningGroupId));
  formData.append('workerGroup', params.workerGroup);
  formData.append('tenantCode', params.tenantCode);
  formData.append('environmentCode', String(params.environmentCode));
  formData.append('workflowDefinitionCode', String(params.workflowDefinitionCode));
  return requestClient.post(
    `/projects/${projectCode}/schedules`,
    formData,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export function updateSchedule(projectCode: number, scheduleId: number, params: CreateScheduleParams) {
  const formData = new URLSearchParams();
  formData.append('schedule', JSON.stringify(params.schedule));
  formData.append('failureStrategy', params.failureStrategy);
  formData.append('warningType', params.warningType);
  formData.append('workflowInstancePriority', params.workflowInstancePriority);
  formData.append('warningGroupId', String(params.warningGroupId));
  formData.append('workerGroup', params.workerGroup);
  formData.append('tenantCode', params.tenantCode);
  formData.append('environmentCode', String(params.environmentCode));
  formData.append('workflowDefinitionCode', String(params.workflowDefinitionCode));
  return requestClient.put(
    `/projects/${projectCode}/schedules/${scheduleId}`,
    formData,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export function onlineSchedule(projectCode: number, scheduleId: number) {
  return requestClient.post(
    `/projects/${projectCode}/schedules/${scheduleId}/online`,
  );
}

export function offlineSchedule(projectCode: number, scheduleId: number) {
  return requestClient.post(
    `/projects/${projectCode}/schedules/${scheduleId}/offline`,
  );
}

export function copyWorkflow(projectCode: number, workflowCode: number, targetProjectCode: number, taskType: string) {
  const formData = new URLSearchParams();
  formData.append('codes', String(workflowCode));
  formData.append('targetProjectCode', String(targetProjectCode));
  formData.append('taskType', taskType);
  return requestClient.post(
    `/projects/${projectCode}/workflow-definition/batch-copy-by-type`,
    formData,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export function deleteWorkflow(projectCode: number, workflowCode: number) {
  return requestClient.delete(
    `/projects/${projectCode}/workflow-definition/${workflowCode}`,
  );
}

export interface WorkflowDetail {
  id: number;
  code: number;
  name: string;
  version: number;
  releaseState: string;
  projectCode: number;
  description: string;
  globalParams: string;
  globalParamList: GlobalParam[];
  globalParamMap: Record<string, any>;
  createTime: string;
  updateTime: string;
  flag: string;
  userId: number;
  userName: string;
  projectName: string | null;
  locations: string;
  scheduleReleaseState: string | null;
  schedule: string | null;
  timeout: number;
  modifyBy: string;
  warningGroupId: number | null;
  executionType: string;
}

export interface GlobalParam {
  prop: string;
  direct: string;
  type: string;
  value: string;
}

export function getWorkflowDetail(projectCode: number, workflowCode: number) {
  return requestClient.get<WorkflowDetail>(
    `/projects/${projectCode}/workflow-definition/${workflowCode}`,
  );
}

export interface ProjectPreference {
  taskPriority: string;
  workerGroup: string;
  environmentCode: number;
  warningType: string;
  tenant: string;
  alertGroups: number;
  failRetryTimes?: number;
  failRetryInterval?: number;
  cpuQuota?: number;
  memoryMax?: number;
}

export interface ProjectPreferenceResponse {
  id: number;
  code: number;
  projectCode: number;
  preferences: string;
}

export function getProjectPreference(projectCode: number) {
  return requestClient.get<ProjectPreferenceResponse>(
    `/projects/${projectCode}/project-preference`,
  ).then((res) => {
    if (res && res.preferences) {
      return typeof res.preferences === 'string' 
        ? JSON.parse(res.preferences) 
        : res.preferences;
    }
    return null;
  });
}

export interface StartWorkflowParams {
  workflowDefinitionCode: number;
  failureStrategy: string;
  warningType: string;
  warningGroupId: number;
  execType: string;
  startNodeList: string;
  taskDependType: string;
  complementDependentMode: string;
  runMode: string;
  workflowInstancePriority: string;
  workerGroup: string;
  tenantCode: string;
  environmentCode: number;
  startParams: GlobalParam[];
  expectedParallelismNumber: number;
  dryRun: number;
  version: number;
  allLevelDependent: boolean;
  executionOrder: string;
  scheduleTime: {
    complementStartDate: string;
    complementEndDate: string;
  };
}

export function startWorkflow(projectCode: number, params: StartWorkflowParams) {
  const formData = new URLSearchParams();
  formData.append('workflowDefinitionCode', String(params.workflowDefinitionCode));
  formData.append('failureStrategy', params.failureStrategy);
  formData.append('warningType', params.warningType);
  formData.append('warningGroupId', String(params.warningGroupId));
  formData.append('execType', params.execType);
  formData.append('startNodeList', params.startNodeList);
  formData.append('taskDependType', params.taskDependType);
  formData.append('complementDependentMode', params.complementDependentMode);
  formData.append('runMode', params.runMode);
  formData.append('workflowInstancePriority', params.workflowInstancePriority);
  formData.append('workerGroup', params.workerGroup);
  formData.append('tenantCode', params.tenantCode);
  formData.append('environmentCode', String(params.environmentCode));
  formData.append('startParams', JSON.stringify(params.startParams));
  formData.append('expectedParallelismNumber', String(params.expectedParallelismNumber));
  formData.append('dryRun', String(params.dryRun));
  formData.append('version', String(params.version));
  formData.append('allLevelDependent', String(params.allLevelDependent));
  formData.append('executionOrder', params.executionOrder);
  formData.append('scheduleTime', JSON.stringify(params.scheduleTime));
  
  return requestClient.post(
    `/projects/${projectCode}/executors/start-workflow-instance`,
    formData,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export interface WorkflowTaskTypeData {
  taskCode: number;
  projectCode: number;
  createTime: string;
  name: string;
  description: string;
  runConfig: string;
  updateTime: string;
  globalParams: string;
  source: string;
  timeout: number;
  target: string;
  fieldMapper?: string;
}

export function getWorkflowTaskTypeData(projectCode: number, workflowCode: number, taskType: string) {
  return requestClient.get<WorkflowTaskTypeData>(
    `/projects/${projectCode}/workflow-task-type/${workflowCode}`,
    { params: { taskType } },
  );
}
