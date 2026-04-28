/**
 * AI 采集助手相关的类型定义
 *
 * Mock 后端的输出严格匹配下方结构，未来替换为真实 LLM 时只需保持
 * 同一形状即可。
 */

export type AiTaskType = 'streamCDC' | 'structuredBatch' | 'unsupported';

export interface AiTaskEndpoint {
  /** 系统类型，如 MYSQL / POSTGRESQL / SFTP / MAXCOMPUTE / HIVE 等 */
  type?: string;
  /** 用户描述里识别到的数据源名称（用于在数据源列表中模糊匹配） */
  datasourceName?: string;
  /** 数据源 ID（解析阶段如果命中已有数据源，会一并填上） */
  datasourceId?: number;
  /** 库 / 项目 */
  database?: string;
  /** 表名（结构化批量可能多张，CDC 单张） */
  table?: string;
  tables?: string[];
}

export interface AiTaskSchedule {
  cron?: string;
  /** 人话级别：每天 / 每小时 / 每月 等 */
  mode?: string;
}

/**
 * AI 解析后的任务计划，前端会基于它渲染预览卡片，
 * 并在用户确认后转成实际的 createXxxTask payload。
 */
export interface AiTaskPlan {
  taskType: AiTaskType;
  /** 任务名建议（落库时可能需要追加项目前缀） */
  name: string;
  description?: string;
  source: AiTaskEndpoint;
  target: AiTaskEndpoint;
  /** 字段映射（可选，目前 mock 不主动给出） */
  fieldMapping?: Record<string, string>;
  schedule?: AiTaskSchedule;
  /** 缺失字段的英文 key 列表，给 UI 高亮提醒 */
  missing: string[];
  /** 0~1，当前规则解析的置信度 */
  confidence: number;
  /** 给用户看的人话总结 */
  summary: string;
  /** 解析时识别到但未消化的提示，比如 "请补充" */
  hints?: string[];
}

export interface AiAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  /** 文本内容（Markdown 友好） */
  content: string;
  /** 关联的任务计划，仅 assistant 消息可能携带 */
  plan?: AiTaskPlan;
  /** 在消息流里展示的状态：成功/失败/进行中 */
  status?: 'pending' | 'success' | 'error';
  /** 消息生成时间戳 */
  timestamp: number;
}

/** 一键创建后回写到消息流的额外信息 */
export interface AiTaskCreationResult {
  ok: boolean;
  message: string;
  /** 创建成功后的任务详情链接，便于用户跳转 */
  link?: string;
}
