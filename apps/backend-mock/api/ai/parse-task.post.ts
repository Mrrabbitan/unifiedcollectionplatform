import { defineEventHandler, readBody } from 'h3';

import { useResponseSuccess } from '~/utils/response';

/**
 * Mock 版的 AI 采集需求解析。
 *
 * 真实环境会接 LLM；这里基于关键词 + 正则推导出
 * 一个结构化的任务 plan。返回结构需与
 * apps/web-antd/src/layouts/widgets/ai-assistant/types.ts 中
 * AiTaskPlan 保持一致。
 */

interface ParseTaskBody {
  text?: string;
  context?: {
    datasourceTypes?: string[];
    projectName?: string;
  };
}

interface MockEndpoint {
  type?: string;
  datasourceName?: string;
  database?: string;
  table?: string;
  tables?: string[];
}

interface MockPlan {
  taskType: 'streamCDC' | 'structuredBatch' | 'unsupported';
  name: string;
  description: string;
  source: MockEndpoint;
  target: MockEndpoint;
  schedule?: { cron?: string; mode?: string };
  fieldMapping?: Record<string, string>;
  missing: string[];
  confidence: number;
  summary: string;
  hints?: string[];
}

const SOURCE_TYPE_KEYWORDS: Array<{ type: string; aliases: RegExp[] }> = [
  {
    type: 'MYSQL',
    aliases: [/mysql/i, /\bmy\s?sql\b/i, /关系型/, /\bmariadb\b/i],
  },
  {
    type: 'POSTGRESQL',
    aliases: [/postgres(ql)?/i, /\bpg\b/i, /\bpostgre\b/i],
  },
  {
    type: 'SFTP',
    aliases: [/sftp/i, /\b文件\b/, /\bftp\b/i],
  },
  {
    type: 'MAXCOMPUTE',
    aliases: [/max\s?compute/i, /\bodps\b/i, /阿里云\s?数仓/, /大数据数仓/],
  },
  {
    type: 'HIVE',
    aliases: [/\bhive\b/i, /数据仓库/],
  },
  {
    type: 'OCEANBASE',
    aliases: [/ocean\s?base/i, /\boceanbase\b/i],
  },
];

const STREAM_KEYWORDS = [
  '实时',
  'cdc',
  'CDC',
  'binlog',
  '增量',
  '流式',
  '实时同步',
];

const BATCH_KEYWORDS = [
  '批量',
  '每日',
  '每天',
  '每小时',
  '定时',
  '离线',
  '快照',
  '全量',
];

function detectType(
  text: string,
  defaultType?: string,
): { type?: string; matched: boolean } {
  for (const item of SOURCE_TYPE_KEYWORDS) {
    if (item.aliases.some((re) => re.test(text))) {
      return { type: item.type, matched: true };
    }
  }
  return { type: defaultType, matched: false };
}

function detectSchedule(text: string): { cron?: string; mode?: string } | undefined {
  if (/每\s?(天|日)/.test(text)) {
    return { mode: '每天 00:30 执行', cron: '0 30 0 * * ?' };
  }
  if (/每\s?小时/.test(text)) {
    return { mode: '每小时执行一次', cron: '0 0 * * * ?' };
  }
  if (/每\s?周/.test(text)) {
    return { mode: '每周一 02:00 执行', cron: '0 0 2 ? * 1' };
  }
  if (/每\s?月/.test(text)) {
    return { mode: '每月 1 日 02:00 执行', cron: '0 0 2 1 * ?' };
  }
  const cronMatch = text.match(/cron\s*[:：]?\s*([0-9*?\-/, ]+)/i);
  if (cronMatch) {
    return { mode: '自定义 cron', cron: cronMatch[1].trim() };
  }
  return undefined;
}

function detectStoryId(text: string): string | undefined {
  const match = text.match(/\b(\d{6,9})\b/);
  return match?.[1];
}

function detectTable(text: string): string | undefined {
  const tableMatch = text.match(/(?:表|table|tbl)\s*[:：]?\s*([\w-]{2,40})/i);
  if (tableMatch) return tableMatch[1];
  // 形如 “order 表” / “user 表” 的中文修饰
  const cnMatch = text.match(/([a-zA-Z][\w-]{1,40})\s*表/);
  if (cnMatch) return cnMatch[1];
  return undefined;
}

function splitSourceTarget(text: string): { sourceText: string; targetText: string } {
  const arrowMatch = text.match(/^(.*?)(?:到|->|=>|至|→)(.*)$/);
  if (arrowMatch) {
    return {
      sourceText: arrowMatch[1] || '',
      targetText: arrowMatch[2] || '',
    };
  }
  const fromMatch = text.match(/(?:从)([\s\S]*?)(?:同步|拉取|抽取|采集)/);
  const toMatch = text.match(/(?:同步|写入|导入|落入|落到|入库)\s*(?:到)?([\s\S]*?)(?:[，。;,]|$)/);
  return {
    sourceText: fromMatch?.[1] || text,
    targetText: toMatch?.[1] || text,
  };
}

function parsePlan(text: string): MockPlan {
  const trimmed = (text || '').trim();
  if (!trimmed) {
    return {
      taskType: 'unsupported',
      name: 'AI 采集任务',
      description: '',
      source: {},
      target: {},
      missing: ['description'],
      confidence: 0,
      summary: '请输入采集需求描述，例如「每天把 MySQL 的 user 表同步到 MaxCompute」。',
    };
  }

  const isStream = STREAM_KEYWORDS.some((kw) => trimmed.toLowerCase().includes(kw.toLowerCase()));
  const isBatch = BATCH_KEYWORDS.some((kw) => trimmed.includes(kw));
  const taskType: MockPlan['taskType'] = isStream
    ? 'streamCDC'
    : isBatch
      ? 'structuredBatch'
      : 'structuredBatch';

  const { sourceText, targetText } = splitSourceTarget(trimmed);
  const sourceDetect = detectType(sourceText, undefined);
  const targetDetect = detectType(targetText, undefined);

  // 如果用户没有明确指定其中一端，复用全文识别结果作为兜底
  const wholeDetect = detectType(trimmed);

  const source: MockEndpoint = {
    type: sourceDetect.type || wholeDetect.type,
    table: detectTable(sourceText),
  };
  const target: MockEndpoint = {
    type:
      targetDetect.type ||
      (sourceDetect.type ? wholeDetect.type : undefined) ||
      (taskType === 'structuredBatch' ? 'MAXCOMPUTE' : 'MYSQL'),
    table: detectTable(targetText),
  };

  // 兜底：如果只识别到一种类型，则把另一端默认放到 MYSQL/MAXCOMPUTE 之间
  if (!source.type && target.type) {
    source.type = target.type === 'MAXCOMPUTE' ? 'MYSQL' : target.type;
  }

  const schedule =
    taskType === 'structuredBatch' ? detectSchedule(trimmed) : undefined;

  const storyId = detectStoryId(trimmed);
  const namePrefix = taskType === 'streamCDC' ? 'cdc_sync' : 'batch_sync';
  const tablePart = source.table || target.table || 'task';
  const baseName = `${namePrefix}_${tablePart}${storyId ? `_${storyId}` : ''}`;

  const missing: string[] = [];
  if (!source.type) missing.push('源端类型');
  if (!target.type) missing.push('目标端类型');
  if (!source.table) missing.push('源端表名');
  if (!target.table) missing.push('目标端表名');
  if (taskType === 'structuredBatch' && !schedule) missing.push('调度策略');
  missing.push('源端数据源', '目标端数据源');

  // 置信度：按命中维度估算
  let hits = 0;
  if (source.type) hits += 1;
  if (target.type) hits += 1;
  if (source.table) hits += 1;
  if (target.table) hits += 1;
  if (schedule) hits += 1;
  if (storyId) hits += 1;
  const confidence = Math.min(0.95, 0.35 + hits * 0.1);

  const summary = buildSummary(taskType, source, target, schedule, storyId);

  return {
    taskType,
    name: baseName,
    description: trimmed,
    source,
    target,
    schedule,
    missing: Array.from(new Set(missing)),
    confidence,
    summary,
    hints: missing.length > 0
      ? ['进入表单后请补充缺失的数据源、字段映射等信息。']
      : undefined,
  };
}

function buildSummary(
  taskType: MockPlan['taskType'],
  source: MockEndpoint,
  target: MockEndpoint,
  schedule?: { cron?: string; mode?: string },
  storyId?: string,
): string {
  const lines: string[] = [];
  lines.push(
    taskType === 'streamCDC'
      ? '已识别为「CDC 实时采集」任务。'
      : '已识别为「结构化批量采集」任务。',
  );
  const srcLabel = `${source.type ?? '未识别'}${source.table ? ` / ${source.table}` : ''}`;
  const tgtLabel = `${target.type ?? '未识别'}${target.table ? ` / ${target.table}` : ''}`;
  lines.push(`源端：${srcLabel}`);
  lines.push(`目标端：${tgtLabel}`);
  if (schedule) lines.push(`调度：${schedule.mode}`);
  if (storyId) lines.push(`关联故事：${storyId}`);
  lines.push('请确认下方计划，可选「跳到表单确认」精修或「直接创建」一键落库。');
  return lines.join('\n');
}

export default defineEventHandler(async (event) => {
  const body = (await readBody<ParseTaskBody>(event)) ?? {};
  const plan = parsePlan(body.text || '');
  return useResponseSuccess({ plan });
});
