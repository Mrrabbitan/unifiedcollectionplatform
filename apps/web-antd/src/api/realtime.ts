import { requestClient } from '#/api/request';
import { useProjectStore } from '#/store';;

export interface SourceConfig {

  kafka?: string;                  // 可选：Kafka连接地址
  topic?: string;                  // 可选：Kafka Topic
  groupId?: string;                // 可选：消费者组ID
  consumePosition?: string;        // 可选：消费起始位置
  timestamp?: string;              // 可选：时间戳字段
  dataFormat?: "Protobuf" | "JSON" | "Avro"; // 可选：数据格式，默认JSON
  isKeyTableName?: boolean;        // 可选：是否使用表名作为key
  tableNameFilter?: string;        // 可选：表名过滤规则
  schemaDefinition?: string;       // 可选：Schema定义
}

export interface TargetConfig {
  catalog?: string;                // 可选：目标数据库catalog
  database?: string;               // 可选：目标数据库名
  table?: string;                  // 可选：目标表名
}

export interface FieldMapping {
  sourceFields: Array<{
    name: string;
    type: string;
    isCustom: boolean;
  }>;
  targetFields: Array<{
    name: string;
    type: string;
  }>;
  mappings: Array<{
    sourceField: string;
    targetField: string;
  }>;

}

export interface RuntimeConfig {
  taskName: string;               // 可选：任务名称
  deploymentMode: string;// 默认选择 perjob/cluster
  yarnQueue: string;
  jobManagerMemory: number;       // 可选：JobManager内存大小(MB)
  taskManagerMemory: number;      // 可选：TaskManager内存大小(MB)
  slotCount: number;              // 可选：slot数量
  parallelism: number;            // 可选：并行度
  checkpointInterval: number;     // 可选：检查点间隔(毫秒)
  stateStoragePath?: string;       // 可选：状态存储路径
  flinkEnvironment?: string; // 可选：Flink环境
  priority?: number;               // 可选：任务优先级
  workerGroup?: string;            // 可选：工作节点组
  retryCount?: number;             // 可选：重试次数
  retryInterval?: number;          // 可选：重试间隔(秒)
  timeoutAlert?: number;           // 可选：超时告警时间(分钟)
  timeoutDelay?: number;           // 可选：超时延迟时间(分钟)
  checkpointTimeout?: number;      // 可选：检查点超时时间(毫秒)
}

export interface RealtimeConfigParams {

  sourceConfig: SourceConfig;
  targetConfig: TargetConfig;
  fieldMapping: FieldMapping;
  runtimeConfig: RuntimeConfig;
}

/**
 * 保存实时采集配置
 */
export function saveRealtimeConfig(data: RealtimeConfigParams) {
  console.log(data); 
  const projectStore = useProjectStore(); 
  const projectCode = projectStore.currentProject?.code || 0;
  return requestClient.post(`/projects/${projectCode}/realtime-definition`, data);
}

/**
 * 更新实时采集配置
 */
export function updateRealtimeConfig(id: string, data: RealtimeConfigParams) {
  return requestClient.put(`/api/realtime/config/update/${id}`, data);
}

/**
 * 获取实时采集配置详情
 */
export function getRealtimeConfig(id: number) {
  const projectStore = useProjectStore(); 
  const projectCode = projectStore.currentProject?.code;
  
  return requestClient.get(`/projects/${projectCode}/realtime-definition/${id}`);
}

/**
 * 删除实时采集配置
 */
export function deleteRealtimeConfig(id: string) {
  return requestClient.delete(`/api/realtime/config/delete/${id}`);
}

/**
 * 获取实时采集配置列表
 */
export function getRealtimeConfigList() {
  return requestClient.get('/api/realtime/config/list');
}

/**
 * 开始实时数据采集任务
 */
export function startRealtimeTask(id: string) {
  return requestClient.post(`/api/realtime/task/start/${id}`);
}

/**
 * 停止实时数据采集任务
 */
export function stopRealtimeTask(id: string) {
  return requestClient.post(`/api/realtime/task/stop/${id}`);
}
