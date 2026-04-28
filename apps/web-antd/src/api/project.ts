import { requestClient } from '#/api/request';

export interface ProjectItem {
  code: number;
  name: string;
  userName: string;
  userId: number;
  description: string;
  defCount: number;
  createTime: string;
  updateTime: string;
}

export interface ProjectListRes {
  total: number;
  totalPage: number;
  currentPage: number;
  totalList: ProjectItem[];
}

export interface ProjectListParams {
  pageSize: number;
  pageNo: number;
  searchVal?: string;
}

export interface CreateProjectParams {
  projectName: string;
  userName: string;
  description?: string;
}

export interface WorkerGroupItem {
  id: number;
  name: string;
}

export interface ProjectParameterItem {
  code: number;
  paramName: string;
  paramValue: string;
  paramDataType: string;
  createUser: string;
  modifyUser: string;
  createTime: string;
  updateTime: string;
}

export interface ProjectParameterListRes {
  total: number;
  totalPage: number;
  currentPage: number;
  totalList: ProjectParameterItem[];
}

export interface ProjectParameterListParams {
  pageSize: number;
  pageNo: number;
  projectCode: number;
  searchVal?: string;
}

export interface CreateProjectParameterParams {
  projectParameterName: string;
  projectParameterValue: string;
  projectParameterDataType: string;
}

export interface ProjectWorkerGroupItem {
  id: number | null;
  projectCode: number;
  workerGroup: string;
  createTime: string | null;
  updateTime: string | null;
}

export interface ProjectPreference {
  taskPriority: string;
  workerGroup: string;
  environmentCode: number;
  failRetryTimes: number;
  failRetryInterval: number;
  cpuQuota: number;
  memoryMax: number;
  warningType: string;
  tenant?: string;
  alertGroups?: number;
}

export interface ProjectPreferenceResponse {
  id: number;
  code: number;
  projectCode: number;
  preferences: string;
  userId: number;
  state: number;
  createTime: string;
  updateTime: string;
}

export interface AnalysisDefineUserCountItem {
  userName: string;
  count: number;
}

export interface AnalysisDefineUserCountRes {
  userList: AnalysisDefineUserCountItem[];
}

export interface AnalysisTaskStateCountRes {
  waitingCount: number;
  runningCount: number;
  successCount: number;
  failureCount: number;
  pauseCount: number;
  stopCount: number;
}

export interface AnalysisWorkflowStateCountRes {
  waitingCount: number;
  runningCount: number;
  successCount: number;
  failureCount: number;
  pauseCount: number;
  stopCount: number;
}

export interface TenantItem {
  id: number;
  tenantName: string;
  tenantCode: string;
}

export interface EnvironmentItem {
  id: number;
  name: string;
  code: number;
  workerGroups?: string[];
}

export interface AlertGroupItem {
  id: number;
  groupName: string;
}

export function getProjectList(params: ProjectListParams) {
  return requestClient.get<ProjectListRes>('/projects', { params });
}

export function getProjectAllList() {
  return requestClient.get<ProjectItem[]>('/projects/list');
}


export function createProject(data: CreateProjectParams) {
  const params = new URLSearchParams();
  params.append('projectName', data.projectName);
  params.append('userName', data.userName);
  if (data.description) {
    params.append('description', data.description);
  } else {
    params.append('description', '');
  }
  return requestClient.post('/projects', params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export function updateProject(data: CreateProjectParams, code: number) {
  const params = new URLSearchParams();
  params.append('projectName', data.projectName);
  params.append('userName', data.userName);
  if (data.description) {
    params.append('description', data.description);
  } else {
    params.append('description', '');
  }
  return requestClient.put(`/projects/${code}`, params, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
}

export function deleteProject(code: number) {
  return requestClient.delete(`/projects/${code}`);
}

export function getWorkerGroupsAll() {
  return requestClient.get<string[]>('/worker-groups/all');
}

export function getProjectParameterList(params: ProjectParameterListParams) {
  const { projectCode, ...rest } = params;
  return requestClient.get<ProjectParameterListRes>(
    `/projects/${projectCode}/project-parameter`,
    { params: rest },
  );
}

export function createProjectParameter(
  projectCode: number,
  data: CreateProjectParameterParams,
) {
  const params = new URLSearchParams();
  params.append('projectParameterName', data.projectParameterName);
  params.append('projectParameterValue', data.projectParameterValue);
  params.append('projectParameterDataType', data.projectParameterDataType);
  return requestClient.post(
    `/projects/${projectCode}/project-parameter`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export function updateProjectParameter(
  projectCode: number,
  code: number,
  data: CreateProjectParameterParams,
) {
  const params = new URLSearchParams();
  params.append('projectParameterName', data.projectParameterName);
  params.append('projectParameterValue', data.projectParameterValue);
  params.append('projectParameterDataType', data.projectParameterDataType);
  return requestClient.put(
    `/projects/${projectCode}/project-parameter/${code}`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export function deleteProjectParameter(projectCode: number, code: number) {
  const params = new URLSearchParams();
  params.append('code', String(code));
  return requestClient.post(
    `/projects/${projectCode}/project-parameter/delete`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export async function getProjectWorkerGroups(projectCode: number) {
  const res = await requestClient.get<{ data: ProjectWorkerGroupItem[]; status: string }>(
    `/projects/${projectCode}/worker-group`,
  );
  return (res as any)?.data || res;
}

export function assignProjectWorkerGroups(
  projectCode: number,
  workerGroups: string[],
) {
  const params = new URLSearchParams();
  params.append('workerGroups', workerGroups.join(','));
  return requestClient.post(
    `/projects/${projectCode}/worker-group`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export function getAnalysisDefineUserCount(projectCode: number) {
  return requestClient.get<AnalysisDefineUserCountRes>(
    '/projects/analysis/define-user-count',
    { params: { projectCode } },
  );
}

export function getAnalysisTaskStateCount(
  startDate: string,
  endDate: string,
  projectCode: number,
) {
  return requestClient.get<AnalysisTaskStateCountRes>(
    '/projects/analysis/task-state-count',
    { params: { startDate, endDate, projectCode } },
  );
}

export function getAnalysisWorkflowStateCount(
  startDate: string,
  endDate: string,
  projectCode: number,
) {
  return requestClient.get<AnalysisWorkflowStateCountRes>(
    '/projects/analysis/workflow-state-count',
    { params: { startDate, endDate, projectCode } },
  );
}

export function getProjectPreference(projectCode: number) {
  return requestClient.get<ProjectPreferenceResponse>(
    `/projects/${projectCode}/project-preference`,
  );
}

export function getTenantsList() {
  return requestClient.get<TenantItem[]>('/tenants/list');
}

export async function getProjectWorkerGroupsForPreference(projectCode: number) {
  const res = await requestClient.get<{ data: ProjectWorkerGroupItem[]; status: string }>(
    `/projects/${projectCode}/worker-group`,
  );
  return (res as any)?.data || res;
}

export function getEnvironmentList() {
  return requestClient.get<EnvironmentItem[]>('/environment/query-environment-list');
}

export function getAlertGroupsList() {
  return requestClient.get<AlertGroupItem[]>('/alert-groups/list');
}

export function toggleProjectPreferenceState(projectCode: number, state: number) {
  const params = new URLSearchParams();
  params.append('state', String(state));
  return requestClient.post(
    `/projects/${projectCode}/project-preference`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export function updateProjectPreference(
  projectCode: number,
  data: ProjectPreference,
) {
  const params = new URLSearchParams();
  params.append('projectPreferences', JSON.stringify(data));
  return requestClient.put(
    `/projects/${projectCode}/project-preference`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );
}

export interface QueueItem {
  id: number;
  queueName: string;
  queue: string;
}

export interface QueueListRes {
  totalList: QueueItem[];
  total: number;
  totalPage: number;
  pageSize: number;
  currentPage: number;
}

export interface QueueListParams {
  pageSize?: number;
  pageNo?: number;
  searchVal?: string;
}

export function getQueueList(params?: QueueListParams) {
  return requestClient.get<QueueListRes>('/queues', { params });
}
