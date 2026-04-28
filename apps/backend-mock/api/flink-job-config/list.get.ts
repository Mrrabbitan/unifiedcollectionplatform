import { defineEventHandler } from 'h3';

import { useResponseSuccess } from '~/utils/response';

/**
 * Mock 版 GET /api/flink-job-config/list
 *
 * 前端通过 `getFlinkJobConfigAll()` 拉，run-config-form 的「资源配置」下拉
 * 展示这些 resourceName，选中后会用 detail 字段反向覆写 flinkVersion /
 * jmMemory / tmMemory / submitMode / parallelism / slot / queueName /
 * checkpointDir / checkpointInterval / checkpointTimeout。
 *
 * 这里精确植入「10G以下任务资源」让 AI 助手按 resourceName 命中 id=100。
 */
const MOCK_FLINK_CONFIGS = [
  {
    id: 100,
    resourceName: '10G以下任务资源',
    flinkVersion: '1.16',
    jmMemory: 2048,
    tmMemory: 4096,
    submitMode: 'PER_JOB',
    parallelism: 2,
    slots: 2,
    checkpointIntervalMs: 60_000,
    checkpointTimeoutMs: 600_000,
    queueName: 'default',
    checkpointDir: 'hdfs:///flink/checkpoints/small',
    createTime: '2026-04-01 10:00:00',
    updateTime: '2026-04-01 10:00:00',
  },
  {
    id: 101,
    resourceName: '10G-50G任务资源',
    flinkVersion: '1.16',
    jmMemory: 4096,
    tmMemory: 8192,
    submitMode: 'PER_JOB',
    parallelism: 4,
    slots: 4,
    checkpointIntervalMs: 60_000,
    checkpointTimeoutMs: 600_000,
    queueName: 'default',
    checkpointDir: 'hdfs:///flink/checkpoints/medium',
    createTime: '2026-04-01 10:00:00',
    updateTime: '2026-04-01 10:00:00',
  },
  {
    id: 102,
    resourceName: '50G以上任务资源',
    flinkVersion: '1.16',
    jmMemory: 8192,
    tmMemory: 16_384,
    submitMode: 'PER_JOB',
    parallelism: 8,
    slots: 4,
    checkpointIntervalMs: 60_000,
    checkpointTimeoutMs: 600_000,
    queueName: 'default',
    checkpointDir: 'hdfs:///flink/checkpoints/large',
    createTime: '2026-04-01 10:00:00',
    updateTime: '2026-04-01 10:00:00',
  },
];

export default defineEventHandler(() => {
  return useResponseSuccess(MOCK_FLINK_CONFIGS);
});
