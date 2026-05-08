/**
 * 模块级单例「采集任务」内存仓库。
 *
 * 之所以需要这个：
 *  - 真实后端会把 create-structured-batch 的入参落库，再由
 *    `/projects/{code}/workflow-definition/collection-task` 列表接口读出来；
 *  - mock 之前没有这层，create 只回 success、列表只回空数组，
 *    所以 AI 自动建的任务在「采集任务管理」里看不到。
 *
 * 现在所有写入路径（AI 自动建任务、表单页提交）都汇聚到 `addTask`，
 * 列表 GET 从 `listTasks` 拿，效果上就和真后端一致。
 *
 * Nitro 是单进程开发服务，模块级 Map 即可作为持久层；
 * 重启 mock 后会被重置，这点和真实环境的"被洗库"语义一致。
 */

export interface MockScheduleInfo {
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

export interface MockWorkflowItem {
  id: number;
  code: number;
  name: string;
  version: number;
  releaseState: 'OFFLINE' | 'ONLINE';
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
  schedule: MockScheduleInfo | null;
  timeout: number;
  modifyBy: string;
  warningGroupId: number | null;
  executionType: string;
  taskType: 'streamCDC' | 'stream' | 'structuredBatch' | 'unStructuredBatch';
  /** 仅 mock 内部保留，便于编辑跳转回写时定位 */
  _aiSource?: string;
}

interface AddTaskInput {
  name: string;
  description?: string;
  timeout?: number;
  taskType?: MockWorkflowItem['taskType'];
  source?: string;
  target?: string;
  fieldMapper?: string;
  runConfig?: string;
  /** 标记触发来源，便于排查 */
  origin?: 'ai' | 'form' | 'seed';
}

interface ListTaskParams {
  searchVal?: string;
  releaseState?: string;
  pageNo: number;
  pageSize: number;
}

const tasksByProject = new Map<number, MockWorkflowItem[]>();

function nowISO() {
  return new Date().toISOString();
}

function nextCode() {
  return Math.floor(Date.now() / 1000) * 1000 + Math.floor(Math.random() * 1000);
}

function getBucket(projectCode: number): MockWorkflowItem[] {
  let bucket = tasksByProject.get(projectCode);
  if (!bucket) {
    bucket = [];
    tasksByProject.set(projectCode, bucket);
    seedIfEmpty(projectCode, bucket);
  }
  return bucket;
}

/**
 * 给空项目放 1 条示例任务，让用户首次进入采集任务管理页面就有东西看。
 * AI 自动建的任务会接在它之后，效果上能看到列表"在变"。
 */
function seedIfEmpty(projectCode: number, bucket: MockWorkflowItem[]) {
  if (bucket.length > 0) return;
  const code = nextCode();
  bucket.push({
    id: code,
    code,
    name: '示例-MySQL订单表批量同步',
    version: 1,
    releaseState: 'OFFLINE',
    projectCode,
    description: '示例任务：每日凌晨从源 MySQL 全量抽取 orders 表到目标库',
    globalParams: '[]',
    globalParamList: [],
    globalParamMap: {},
    createTime: nowISO(),
    updateTime: nowISO(),
    flag: 'YES',
    userId: 1,
    userName: 'admin',
    projectName: null,
    locations: '',
    scheduleReleaseState: null,
    schedule: null,
    timeout: 0,
    modifyBy: 'admin',
    warningGroupId: null,
    executionType: 'PARALLEL',
    taskType: 'structuredBatch',
    _aiSource: 'seed',
  });
}

export function addTask(
  projectCode: number,
  input: AddTaskInput,
): MockWorkflowItem {
  const bucket = getBucket(projectCode);
  const code = nextCode();
  const item: MockWorkflowItem = {
    id: code,
    code,
    name: input.name || `mock_task_${code}`,
    version: 1,
    releaseState: 'OFFLINE',
    projectCode,
    description: input.description ?? '',
    globalParams: '[]',
    globalParamList: [],
    globalParamMap: {},
    createTime: nowISO(),
    updateTime: nowISO(),
    flag: 'YES',
    userId: 1,
    userName: input.origin === 'ai' ? 'AI 助手' : 'admin',
    projectName: null,
    locations: '',
    scheduleReleaseState: null,
    schedule: null,
    timeout: input.timeout ?? 0,
    modifyBy: input.origin === 'ai' ? 'AI 助手' : 'admin',
    warningGroupId: null,
    executionType: 'PARALLEL',
    taskType: input.taskType ?? 'structuredBatch',
    _aiSource: input.origin,
  };
  // 新建的放最上面，符合时间倒序的常见预期
  bucket.unshift(item);
  return item;
}

export function listTasks(projectCode: number, params: ListTaskParams) {
  const bucket = getBucket(projectCode);
  const keyword = (params.searchVal ?? '').trim();
  const releaseFilter = (params.releaseState ?? '').trim();
  let filtered = bucket;
  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(kw) ||
        (t.description ?? '').toLowerCase().includes(kw),
    );
  }
  if (releaseFilter) {
    filtered = filtered.filter((t) => t.releaseState === releaseFilter);
  }
  const pageSize = Math.max(1, params.pageSize || 10);
  const pageNo = Math.max(1, params.pageNo || 1);
  const total = filtered.length;
  const totalPage = Math.max(1, Math.ceil(total / pageSize));
  const start = (pageNo - 1) * pageSize;
  const totalList = filtered.slice(start, start + pageSize);
  return {
    totalList,
    total,
    totalPage,
    currentPage: pageNo,
    pageNo,
    pageSize,
  };
}

export function removeTask(projectCode: number, code: number): boolean {
  const bucket = getBucket(projectCode);
  const idx = bucket.findIndex((t) => t.code === code);
  if (idx < 0) return false;
  bucket.splice(idx, 1);
  return true;
}

export function updateTaskRelease(
  projectCode: number,
  code: number,
  releaseState: 'OFFLINE' | 'ONLINE',
): MockWorkflowItem | null {
  const bucket = getBucket(projectCode);
  const item = bucket.find((t) => t.code === code);
  if (!item) return null;
  item.releaseState = releaseState;
  item.updateTime = nowISO();
  return item;
}
