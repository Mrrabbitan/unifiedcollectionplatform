export type TaskType = string;

export interface TaskDefinition {
  id: number;
  code: number;
  name: string;
  version: number;
  description: string;
  projectCode: number;
  userId: number;
  taskType: TaskType;
  taskParams: Record<string, any>;
  flag: string;
  taskPriority: string;
  workerGroup: string;
  environmentCode: number;
  failRetryTimes: number;
  failRetryInterval: number;
  timeoutFlag: 'OPEN' | 'CLOSE';
  timeout: number;
  delayTime: number;
  resourceIds: string;
  createTime: string;
  updateTime: string;
}

export interface Connect {
  id?: number;
  name: string;
  preTaskCode: number;
  postTaskCode: number;
  conditionType: string;
  conditionParams: any;
}

export interface WorkflowDefinition {
  id: number;
  code: number;
  name: string;
  version: number;
  releaseState: string;
  projectCode: number;
  description: string;
  globalParams: string;
  locations: string;
  timeout: number;
  tenantId: number;
  tenantCode: string;
  executionType: string;
  warningGroupId: number;
}

export interface WorkflowData {
  workflowDefinition: WorkflowDefinition;
  workflowTaskRelationList: Connect[];
  taskDefinitionList: TaskDefinition[];
}

export interface NodeData {
  code: number;
  taskType: TaskType;
  name: string;
  flag?: string;
}

export interface Dragged {
  x: number;
  y: number;
  type: TaskType;
}

export interface Coordinate {
  x: number;
  y: number;
}

export interface GlobalParam {
  key: string;
  direct: string;
  type: string;
  value: string;
}

export interface SaveForm {
  name: string;
  description: string;
  executionType: string;
  timeoutFlag: boolean;
  timeout: number;
  globalParams: GlobalParam[];
  release: boolean;
}

export interface Location {
  taskCode: number;
  x: number;
  y: number;
}

export interface TaskMenuItem {
  taskType: TaskType;
  taskCategory: string;
  collection: boolean;
}

export const TASK_CATEGORY_LABELS: Record<string, string> = {
  Universal: '通用任务',
  Cloud: '云服务',
  Logic: '逻辑节点',
  DataIntegration: '数据集成',
  MachineLearning: '机器学习',
  Other: '其他',
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  SHELL: 'Shell',
  SQL: 'SQL',
  SPARK: 'Spark',
  FLINK: 'Flink',
  PYTHON: 'Python',
  HTTP: 'HTTP',
  DATAX: 'DataX',
  SQOOP: 'Sqoop',
  CONDITIONS: '条件分支',
  SUB_PROCESS: '子流程',
  DEPENDENT: '依赖',
  KAFKA: 'Kafka',
  WATERDROP: 'Waterdrop',
  EMR: 'EMR',
  SUB_WORKFLOW: '子工作流',
  SEATUNNEL: 'SeaTunnel',
  JUPYTER: 'Jupyter',
  KUBEFLOW: 'Kubeflow',
  ZEPPELIN: 'Zeppelin',
  REMOTESHELL: '远程Shell',
};
