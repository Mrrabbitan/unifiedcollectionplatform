import { defineEventHandler, readBody } from 'h3';

import { useResponseSuccess } from '~/utils/response';

/**
 * Mock 版的 AI 采集需求解析。
 *
 * 真实环境会接 LLM；这里基于关键词 + 正则推导出
 * 一个结构化的任务 plan。返回结构需与
 * apps/web-antd/src/layouts/widgets/ai-assistant/types.ts 中
 * AiTaskPlan 保持一致。
 *
 * 解析能力（结构化批量场景）：
 *  - 任务名称 / 任务名 / name=xxx
 *  - 源端类型 / 目标端类型（MYSQL / POSTGRESQL / SFTP / MAXCOMPUTE / HIVE / OCEANBASE）
 *  - 数据源（IP 或 name），按"源端 / 目标端"分块归位
 *  - 源端表名 / 目标端表名
 *  - 自动建表 → tableNameMode=auto
 *  - 追加数据 / 覆盖数据 → dataSaveMode
 *  - 运行模式 LOCAL / FLINK
 *  - 资源配置：xxx → runConfig.flinkJobConfigName
 *  - 调度：每天 / 每小时 / 每周 / 每月 / cron 表达式
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
  datasourceHost?: string;
  database?: string;
  table?: string;
  tables?: string[];
  tableNameMode?: 'auto' | 'select';
  dataSaveMode?: 'APPEND_DATA' | 'DROP_DATA';
}

interface MockRunConfig {
  runMode?: 'FLINK' | 'LOCAL';
  flinkJobConfigName?: string;
}

interface MockPlan {
  taskType: 'streamCDC' | 'structuredBatch' | 'unsupported';
  name: string;
  description: string;
  source: MockEndpoint;
  target: MockEndpoint;
  schedule?: { cron?: string; mode?: string };
  runConfig?: MockRunConfig;
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
  '批量采集',
  '每日',
  '每天',
  '每小时',
  '定时',
  '离线',
  '快照',
  '全量',
];

const IP_RE = /((?:\d{1,3}\.){3}\d{1,3})(?::\d+)?/;
const NAME_RE = /([A-Za-z][\w-]{2,})/;

function detectType(
  text: string,
  defaultType?: string,
): { matched: boolean; type?: string } {
  for (const item of SOURCE_TYPE_KEYWORDS) {
    if (item.aliases.some((re) => re.test(text))) {
      return { type: item.type, matched: true };
    }
  }
  return { type: defaultType, matched: false };
}

function detectSchedule(
  text: string,
): undefined | { cron?: string; mode?: string } {
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

function detectTaskName(text: string): string | undefined {
  // 任务名称：xxx / 任务名: xxx / name=xxx / 名称：xxx
  const m = text.match(/(?:任务\s*名(?:称)?|名称|name)\s*[:：=]\s*([\w-]{2,80})/i);
  return m?.[1];
}

function detectFlinkResourceName(text: string): string | undefined {
  const m = text.match(/资源配置\s*[:：]?\s*([^\n,，。;；]+)/);
  return m?.[1]?.trim().replace(/[.\s]+$/, '') || undefined;
}

function detectRunMode(text: string): 'FLINK' | 'LOCAL' | undefined {
  if (/运行模式\s*[:：]?\s*LOCAL/i.test(text) || /\blocal\s*运行\b/i.test(text)) {
    return 'LOCAL';
  }
  if (/运行模式\s*[:：]?\s*FLINK/i.test(text) || /\bflink\s*运行\b/i.test(text)) {
    return 'FLINK';
  }
  return undefined;
}

function detectTableNameMode(text: string): 'auto' | 'select' | undefined {
  if (/自动建表/.test(text)) return 'auto';
  if (/已有表|从.*表中选|手动选表/.test(text)) return 'select';
  return undefined;
}

function detectDataSaveMode(
  text: string,
): 'APPEND_DATA' | 'DROP_DATA' | undefined {
  if (/追加(数据|模式)?/.test(text) || /\bappend\b/i.test(text)) {
    return 'APPEND_DATA';
  }
  if (/覆盖(数据|模式)?|删除并重建|清空再写/.test(text) || /\bdrop\b/i.test(text)) {
    return 'DROP_DATA';
  }
  return undefined;
}

/**
 * 在一段（源端 / 目标端）描述里抽出 IP / 数据源名 / 表名。
 * 注意：
 *  - "数据源 10.177.64.38" 这样的写法 → host
 *  - "数据源 zb_cjzh_realtime" 这样的写法 → name
 *  - "表名：src_sys_bak" → table
 */
function detectEndpointFields(segment: string): {
  datasourceHost?: string;
  datasourceName?: string;
  table?: string;
} {
  const out: {
    datasourceHost?: string;
    datasourceName?: string;
    table?: string;
  } = {};

  // 1) 表名：xxx / 表 xxx / table=xxx
  const tableMatch =
    segment.match(/(?:目标表名|源表名|表名|table|tbl)\s*[:：=]?\s*([\w-]{2,80})/i) ||
    segment.match(/([a-zA-Z][\w-]{1,80})\s*表/);
  if (tableMatch) out.table = tableMatch[1];

  // 2) 数据源 IP（行内含 IP 时优先识别为 host）
  const ipLine = segment.match(/数据源[^\n]*?((?:\d{1,3}\.){3}\d{1,3})/);
  if (ipLine) {
    out.datasourceHost = ipLine[1];
  } else {
    const ipAny = segment.match(IP_RE);
    if (ipAny) out.datasourceHost = ipAny[1];
  }

  // 3) 数据源 name（"数据源 xxxx" / "数据源：xxxx" / "数据源=xxxx"）
  if (!out.datasourceHost) {
    const nameMatch = segment.match(
      /数据源\s*[:：=]?\s*([A-Za-z][\w-]{2,80})/,
    );
    if (nameMatch && !/^MYSQL$|^POSTGRESQL$|^MAXCOMPUTE$|^HIVE$|^SFTP$/i.test(nameMatch[1])) {
      out.datasourceName = nameMatch[1];
    }
  } else {
    // 即使匹到了 host，也允许同一段里再抽 name
    const nameMatch = segment.match(
      /数据源\s*[:：=]?\s*([A-Za-z][\w-]{2,80})/,
    );
    if (nameMatch && !IP_RE.test(nameMatch[1])) {
      out.datasourceName = nameMatch[1];
    }
  }

  return out;
}

/**
 * 把整段描述切成"源端段"和"目标端段"。
 * 优先按多行的「源端…」「目标端…」标签切分；
 * 退化时按「从 X 到 Y」/「X → Y」切分。
 */
function splitSourceTarget(text: string): {
  sourceText: string;
  targetText: string;
} {
  const lines = text.split(/\r?\n/);
  const sourceLines: string[] = [];
  const targetLines: string[] = [];
  let mode: 'none' | 'source' | 'target' = 'none';

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const isSourceHeader = /(^|\s)源端|^源\s*[:：]/i.test(line);
    const isTargetHeader = /(^|\s)目标端|^目标\s*[:：]|^目的端|^写入端/i.test(line);

    // 同一行同时含"源端"和"目标端"时，按出现位置切两段
    if (isSourceHeader && isTargetHeader) {
      const idx = line.search(/目标端|目的端|写入端|目标\s*[:：]/);
      sourceLines.push(line.slice(0, idx));
      targetLines.push(line.slice(idx));
      continue;
    }
    if (isSourceHeader) {
      mode = 'source';
      sourceLines.push(line);
      continue;
    }
    if (isTargetHeader) {
      mode = 'target';
      targetLines.push(line);
      continue;
    }
    if (mode === 'source') sourceLines.push(line);
    else if (mode === 'target') targetLines.push(line);
  }

  if (sourceLines.length || targetLines.length) {
    return {
      sourceText: sourceLines.join('\n'),
      targetText: targetLines.join('\n'),
    };
  }

  // 退化方案：箭头 / "从…到…"
  const arrowMatch = text.match(/^([\S\s]*?)(?:到|->|=>|至|→)([\S\s]*)$/);
  if (arrowMatch) {
    return {
      sourceText: arrowMatch[1] || '',
      targetText: arrowMatch[2] || '',
    };
  }
  const fromMatch = text.match(/(?:从)([\S\s]*?)(?:同步|拉取|抽取|采集)/);
  const toMatch = text.match(
    /(?:同步|写入|导入|落入|落到|入库)\s*(?:到)?([\S\s]*?)(?:[，。;,]|$)/,
  );
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
      summary:
        '请输入采集需求描述，例如「每天把 MySQL 的 user 表同步到 MaxCompute」。',
    };
  }

  const isStream = STREAM_KEYWORDS.some((kw) =>
    trimmed.toLowerCase().includes(kw.toLowerCase()),
  );
  const isBatch = BATCH_KEYWORDS.some((kw) => trimmed.includes(kw));
  const taskType: MockPlan['taskType'] = isStream
    ? 'streamCDC'
    : isBatch
      ? 'structuredBatch'
      : 'structuredBatch';

  const { sourceText, targetText } = splitSourceTarget(trimmed);
  const sourceDetect = detectType(sourceText);
  const targetDetect = detectType(targetText);
  const wholeDetect = detectType(trimmed);

  const sourceFields = detectEndpointFields(sourceText);
  const targetFields = detectEndpointFields(targetText);

  const source: MockEndpoint = {
    type: sourceDetect.type || wholeDetect.type,
    datasourceHost: sourceFields.datasourceHost,
    datasourceName: sourceFields.datasourceName,
    table: sourceFields.table,
  };
  const target: MockEndpoint = {
    type:
      targetDetect.type ||
      (sourceDetect.type ? wholeDetect.type : undefined) ||
      (taskType === 'structuredBatch' ? 'MAXCOMPUTE' : 'MYSQL'),
    datasourceHost: targetFields.datasourceHost,
    datasourceName: targetFields.datasourceName,
    table: targetFields.table,
    tableNameMode: detectTableNameMode(targetText) || detectTableNameMode(trimmed),
    dataSaveMode: detectDataSaveMode(targetText) || detectDataSaveMode(trimmed),
  };

  // 如果只识别到一种类型，则把另一端默认放到 MYSQL/MAXCOMPUTE 之间
  if (!source.type && target.type) {
    source.type = target.type === 'MAXCOMPUTE' ? 'MYSQL' : target.type;
  }

  const schedule =
    taskType === 'structuredBatch' ? detectSchedule(trimmed) : undefined;

  const runConfig: MockRunConfig | undefined = (() => {
    const runMode = detectRunMode(trimmed);
    const flinkJobConfigName = detectFlinkResourceName(trimmed);
    if (runMode || flinkJobConfigName) {
      return { runMode, flinkJobConfigName };
    }
    return undefined;
  })();

  const storyId = detectStoryId(trimmed);
  const explicitName = detectTaskName(trimmed);
  const namePrefix = taskType === 'streamCDC' ? 'cdc_sync' : 'batch_sync';
  const tablePart = source.table || target.table || 'task';
  const baseName =
    explicitName ?? `${namePrefix}_${tablePart}${storyId ? `_${storyId}` : ''}`;

  const missing: string[] = [];
  if (!source.type) missing.push('源端类型');
  if (!target.type) missing.push('目标端类型');
  if (!source.table) missing.push('源端表名');
  if (target.tableNameMode !== 'auto' && !target.table) {
    missing.push('目标端表名');
  }
  if (taskType === 'structuredBatch' && !schedule) missing.push('调度策略');
  if (!source.datasourceHost && !source.datasourceName) {
    missing.push('源端数据源');
  }
  if (!target.datasourceHost && !target.datasourceName) {
    missing.push('目标端数据源');
  }
  if (!runConfig?.flinkJobConfigName && !runConfig?.runMode) {
    missing.push('运行 / 资源配置');
  }

  // 置信度按命中维度估算
  let hits = 0;
  if (source.type) hits += 1;
  if (target.type) hits += 1;
  if (source.table) hits += 1;
  if (target.table || target.tableNameMode === 'auto') hits += 1;
  if (source.datasourceHost || source.datasourceName) hits += 1;
  if (target.datasourceHost || target.datasourceName) hits += 1;
  if (runConfig?.runMode) hits += 1;
  if (runConfig?.flinkJobConfigName) hits += 1;
  if (schedule) hits += 1;
  if (storyId) hits += 1;
  const confidence = Math.min(0.97, 0.3 + hits * 0.08);

  const summary = buildSummary(
    taskType,
    source,
    target,
    schedule,
    storyId,
    runConfig,
    baseName,
  );

  return {
    taskType,
    name: baseName,
    description: trimmed,
    source,
    target,
    schedule,
    runConfig,
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
  schedule: undefined | { cron?: string; mode?: string },
  storyId: string | undefined,
  runConfig: MockRunConfig | undefined,
  taskName: string,
): string {
  const lines: string[] = [];
  lines.push(
    taskType === 'streamCDC'
      ? '已识别为「CDC 实时采集」任务。'
      : '已识别为「结构化批量采集」任务。',
  );
  lines.push(`任务名称：${taskName}`);
  const srcDs = source.datasourceName || source.datasourceHost;
  const tgtDs = target.datasourceName || target.datasourceHost;
  const srcLabel = `${source.type ?? '未识别'}${srcDs ? ` / ${srcDs}` : ''}${source.table ? ` / ${source.table}` : ''}`;
  const tgtLabel = `${target.type ?? '未识别'}${tgtDs ? ` / ${tgtDs}` : ''}${target.tableNameMode === 'auto' ? ' / 自动建表' : target.table ? ` / ${target.table}` : ''}`;
  lines.push(`源端：${srcLabel}`);
  lines.push(`目标端：${tgtLabel}`);
  if (target.dataSaveMode) {
    lines.push(
      `保存模式：${target.dataSaveMode === 'APPEND_DATA' ? '追加数据' : '覆盖数据'}`,
    );
  }
  if (runConfig?.runMode) lines.push(`运行模式：${runConfig.runMode}`);
  if (runConfig?.flinkJobConfigName) {
    lines.push(`资源配置：${runConfig.flinkJobConfigName}`);
  }
  if (schedule) lines.push(`调度：${schedule.mode}`);
  if (storyId) lines.push(`关联故事：${storyId}`);
  lines.push(
    '请确认下方计划，可选「跳到表单确认」精修或「直接创建」一键落库。',
  );
  return lines.join('\n');
}

export default defineEventHandler(async (event) => {
  const body = (await readBody<ParseTaskBody>(event)) ?? {};
  const plan = parsePlan(body.text || '');
  return useResponseSuccess({ plan });
});
