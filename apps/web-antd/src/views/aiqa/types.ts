import type { DataSourceInfo } from '#/api/datasource/datasource';

export interface DatasourcePick {
  type: string;
  datasource: DataSourceInfo;
}

export interface PickedSourceTarget {
  source: DatasourcePick;
  target: DatasourcePick;
}

export interface MissingField {
  key: string;
  label: string;
  type: 'number' | 'password' | 'text' | 'textarea';
  required: boolean;
  placeholder?: string;
  defaultValue?: number | string;
}

export interface MissingParamsQuestion {
  id: string;
  title: string;
  description?: string;
  fields: MissingField[];
}

export interface ActionPayload {
  endpoint?: string;
  datasourcePayload?: {
    name: string;
    type: string;
    host?: string;
    port?: number;
    database?: string;
    userName?: string;
    password?: string;
    note?: string;
  };
  taskPayload?: {
    name: string;
    description?: string;
    timeout?: number;
    source: Record<string, any>;
    target: Record<string, any>;
    fieldMapper?: Record<string, any>;
    runConfig?: Record<string, any>;
  };
  result?: any;
  link?: { label: string; to: string };
}

export type ActionStatus = 'fail' | 'pending' | 'running' | 'success';

export interface ActionItem {
  id: string;
  step: string;
  kind: 'create-datasource' | 'create-task' | 'info';
  status: ActionStatus;
  payload?: ActionPayload;
  result?: any;
  error?: string;
}

export type AiStreamEvent =
  | { type: 'action'; action: ActionItem }
  | { type: 'answer'; delta: string }
  | { type: 'done' }
  | { type: 'error'; message: string }
  | { type: 'meta'; conversationId: string }
  | { type: 'question'; question: MissingParamsQuestion }
  | { type: 'thinking'; text: string };

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  thinking?: string;
  thinkingDone?: boolean;
  attachment?: AttachmentMeta;
  actions?: ActionItem[];
  question?: MissingParamsQuestion;
  questionResolved?: boolean;
  loading?: boolean;
  errored?: boolean;
}

export interface AttachmentMeta {
  docId: string;
  fileName: string;
  size: number;
  summary?: string;
  detected?: ParsedDocSummary;
}

export interface ParsedDocSummary {
  protocol: 'http' | 'jdbc' | 'kafka' | 'sftp' | 'unknown';
  vendor?: string;
  missingFields: string[];
  dataGroups: Array<{
    name: string;
    granularity?: string;
    description?: string;
    fields?: Array<{ name: string; type?: string; comment?: string }>;
  }>;
  rawTextPreview?: string;
}

export interface ChatRequestPayload {
  conversationId?: string;
  source: { id: number; name: string; type: string };
  target: { id: number; name: string; type: string };
  attachment?: { docId: string; fileName: string };
  userMessage?: string;
  resumeContext?: {
    questionId: string;
    answers: Record<string, string>;
  };
}
