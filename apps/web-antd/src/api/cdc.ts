// 1. 定义资源列表中的单项结构
export interface ResourceItem {
  resourceName: string;
}

// 2. 定义本地参数结构
export interface LocalParam {
  prop: string;
  direct: string;
  type: string;
  value: string;
}

// 3. 定义 taskParams 的结构
export interface TaskParams {
  localParams: LocalParam[];
  rawScript: string;
  resourceList: ResourceItem[]; // 已更新为具体类型
  startupScript: string;
  useCustom: boolean;
  runMode: string;
  deployMode: string;
  others: string;
}

// 4. 主接口定义
export interface TaskDefinition {
  code: number;
  delayTime: string;
  description: string;
  environmentCode: number;
  failRetryInterval: string;
  failRetryTimes: string;
  flag: string;
  name: string;
  taskParams: TaskParams;
  taskPriority: string;
  taskType: string;
  timeout: number;
  timeoutFlag: string;
  timeoutNotifyStrategy: string;
  workerGroup: string;
  cpuQuota: number;
  memoryMax: number;
  taskExecuteType: string;
}

export interface TaskRelation {
  name: string;
  preTaskCode: number;
  preTaskVersion: number;
  postTaskCode: number;
  postTaskVersion: number;
  conditionType: string;
  conditionParams: {};
}

export interface NodeLocation {
  taskCode: number;
  x: number;
  y: number;
}

export interface JobEnvConfig {
  "job.name": string;
  "job.mode": string;
  "checkpoint.interval": number;
  "checkpoint.timeout": number;
  "execution.engine"?: string;
  "execution.parallelism": number;
  "flink.jobmanager.memory.process.size"?: string;
  "flink.taskmanager.memory.process.size"?: string;
  "flink.state.checkpoints.dir"?: string;
  "flink.execution.target"?: string;
  "flink.yarn.application.queue"?: string;
}

export interface CDCSource {
  "url": string;
  "username": string;
  "password": string;
  "table-names": string[];
  "startup.mode": string;
  "startup.specific-offset.file"?: string;
  "startup.specific-offset.pos"?: number;
  "startup.timestamp"?: number|string;
  "stop.mode"?: string;
  "stop.specific-offset.file"?: string;
  "stop.specific-offset.pos"?: number;
  "connect.timeout.ms": number;
  "connect.max-retries": number;
  "connection.pool.size": number;
  "plugin_output": string;
}

export interface MysqlSource {
  "url": string;
  "driver": string;
  "user": string;
  "password": string;
  "table": string;
  "max_retries": number;
  "batch_size": number;
  "max_commit_attempts": number;
  "plugin_input": string;
  "generate_sink_sql": boolean;
  "database": string;
}

export type PostgresqlSource = MysqlSource;
export type OceanbaseSource = MysqlSource;

export type CommonSource = MysqlSource | PostgresqlSource | OceanbaseSource;

export interface MaxComputeSource  {
  "accessId": string;
  "accesskey": string;
  "endpoint": string;
  "project": string;
  "table_name": string;
  "partition_spec"?: string;
  "schema_save_mode": string;
  "data_save_mode": string;
  "overwrite": boolean;
  "plugin_input": string;
  "tunnel_endpoint"?: string;
}

export interface MysqlConfig {
  startupMode: string;
  binlogName: string;
  binlogPosition: number | undefined;
  startupTimestamp: number | string | undefined;
  stopMode: string;
  stopBinlogName: string;
  stopBinlogPosition: number | undefined;
  timeout: number;
  retryTimes: number;
  connectionPool: number;
}

export interface PostgresqlConfig {
  startupMode: string;
  decodePlugin: string;
  timeout: number;
  retryTimes: number;
  connectionPool: number;
}

export interface SourceConfig {
  type: string;
  datasourceId: number | undefined;
  tableName: string;
  config: MysqlConfig | PostgresqlConfig;
}

export interface TargetDbConfig {
  schemaMode: string;
  dataMode: string;
  customSql: string;
  retry: number;
  cacheRows: number;
  transactionRetry: number;
}

export interface MaxcomputeConfig {
  overwriteData: boolean;
  schemaMode: string;
  dataMode: string;
  customSql: string;
}

export interface TargetConfig {
  type: string;
  datasourceId: number | undefined;
  tableName: string;
  config: TargetDbConfig | MaxcomputeConfig;
}

export interface TaskConfig {
  jobName: string;
  description: string;
  priority: string;
  workerGroup: string;
  environment: number;
  retryTimes: number;
  retryInterval: number;
  cpuQuota: number;
  maxMemory: number;
  delayTime: number;
  timeoutFlag: boolean;
  timeoutAlert: boolean;
  timeoutStrategy: string[];
  timeout: number;
  execStrategy: string;
  releaseState?: string;
}

export interface EngineConfig {
  engine: string;
  deployMode: string;
  parallelism: number;
  checkpointInterval: number;
  checkpointTimeout: number;
  checkpointAddress: string;
  taskmanagerMemory: number;
  jobmanagerMemory: number;
  yarnQueue: string;
}

export interface TaskData {
  source: SourceConfig;
  target: TargetConfig;
  fieldMapping: Record<string, string>;
  taskConfig: TaskConfig;
  engineConfig: EngineConfig;
}



