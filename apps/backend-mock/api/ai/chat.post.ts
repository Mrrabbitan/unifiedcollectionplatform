import { createEventStream, defineEventHandler, readBody } from 'h3';

import {
  PINEAPPLE_AUTO_PICK_GROUPS,
  PINEAPPLE_FIXTURE_GROUPS,
} from '~/utils/aiqa-fixtures';

import { getParsedDoc } from './parse-docx.post';

interface ChatBody {
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

function nextId(prefix = 'a') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// 演示节奏：让用户能看清「思考一步 → 输出一句 → 落库一条」的过程
const THINKING_LINE_DELAY = 700;
const ANSWER_CHUNK_DELAY = 55;
const ANSWER_CHUNK_SIZE = 3;
const ACTION_GAP_DELAY = 450;
const PHASE_GAP_DELAY = 900;

/** Push a single line-delimited JSON event (custom format, not strict SSE
 * but works through Vite's http-proxy and is trivial to consume in the
 * browser via ReadableStream). */
async function pushLine(stream: any, payload: any) {
  await stream.push(`${JSON.stringify(payload)}\n`);
}

async function streamThinking(stream: any, lines: string[]) {
  for (const line of lines) {
    await pushLine(stream, { type: 'thinking', text: `${line}\n` });
    await sleep(THINKING_LINE_DELAY);
  }
  // 思考完毕后给一个明显的过渡停顿，让前端把 thinking 折起来
  await sleep(PHASE_GAP_DELAY);
}

async function streamAnswer(
  stream: any,
  text: string,
  chunkSize = ANSWER_CHUNK_SIZE,
) {
  for (let i = 0; i < text.length; i += chunkSize) {
    await pushLine(stream, { type: 'answer', delta: text.slice(i, i + chunkSize) });
    await sleep(ANSWER_CHUNK_DELAY);
  }
}

async function pushAction(
  stream: any,
  action: {
    id: string;
    step: string;
    kind: 'create-datasource' | 'create-task' | 'info';
    status: 'fail' | 'pending' | 'running' | 'success';
    payload?: any;
  },
) {
  await pushLine(stream, { type: 'action', action });
}

function planDataSourcePayload(
  body: ChatBody,
  answers: Record<string, string>,
) {
  const host = answers.host?.trim();
  const port = Number(answers.port || 22) || 22;
  const userName = answers.username?.trim();
  const password = answers.password ?? '';
  const note = answers.note ?? '由智能问答自动注册的 SFTP 数据源（北京联通 / 松果大数据）';
  return {
    name: `sftp_pineapple_${Math.floor(Date.now() / 1000)}`,
    type: 'SFTP',
    host,
    port,
    userName,
    password,
    database: '',
    note,
  };
}

function planTaskPayload(opts: {
  body: ChatBody;
  groupName: string;
  fileNamePattern?: string;
  granularity?: string;
}) {
  const { body, groupName, fileNamePattern, granularity } = opts;
  const slug = groupName
    .replaceAll(/[（）]/g, '')
    .replaceAll(/\s+/g, '_')
    .replaceAll(/[^\u4e00-\u9fa5\w]/g, '_');
  const taskName = `pineapple_${slug}_${Math.floor(Date.now() / 1000)}`;
  return {
    name: taskName,
    description: `${groupName}（${granularity ?? '-'}）→ ${body.target.type} ${body.target.name}`,
    timeout: 0,
    source: {
      type: 'SFTP',
      datasourceId: body.source.id,
      datasourceName: body.source.name,
      config: {
        path: '/',
        fileNamePattern,
        granularity,
        groupName,
      },
    },
    target: {
      type: body.target.type,
      datasourceId: body.target.id,
      datasourceName: body.target.name,
      config: {
        tableNameMode: 'auto',
        dataSaveMode: 'APPEND_DATA',
      },
    },
    runConfig: { runMode: 'LOCAL' },
  };
}

async function runFreeFormChat(stream: any, body: ChatBody) {
  await streamThinking(stream, [
    `用户提问："${body.userMessage ?? ''}"`,
    '没有附带接口文档，按通用问答模式回答。',
    `当前会话上下文：源 = ${body.source.type} / ${body.source.name}，目标 = ${body.target.type} / ${body.target.name}。`,
  ]);
  const answer = `基于你选择的源（${body.source.type} · ${body.source.name}）与目标（${body.target.type} · ${body.target.name}），我可以帮你做：\n\n1. 解读已选数据源的连接参数和能力边界；\n2. 设计一条采集任务（批量 / 增量 / CDC）的最小可行方案；\n3. 上传一份 .docx 接口文档，我会自动抽取里面的数据分组、SFTP/HTTP 连接信息，并尝试一键创建采集任务。\n\n你可以直接点输入框上方的"上传接口文档"按钮试试。`;
  await streamAnswer(stream, answer);
  await pushLine(stream, { type: 'done' });
}

async function runUnknownDocFlow(stream: any, body: ChatBody) {
  await streamThinking(stream, [
    `读取附件 ${body.attachment?.fileName}…`,
    '未识别为标准接口文档（缺少 SFTP / API 关键字与数据分组结构）。',
    '回退为普通问答。',
  ]);
  const answer = `已读取 ${body.attachment?.fileName}，但未识别为典型的接口/数据规范文档。\n\n当前演示版本仅对 SFTP 类接口文档做了完整剧本支持，建议上传"松果大数据接口文档-北京联通"或同类文档体验完整自动化流程。`;
  await streamAnswer(stream, answer);
  await pushLine(stream, { type: 'done' });
}

async function runPineappleParseStage(
  stream: any,
  body: ChatBody,
  groupCount: number,
) {
  await streamThinking(stream, [
    `读取附件 ${body.attachment?.fileName}…`,
    '检测到「SFTP」「栅格」「红松」「微格大数据」等关键词。',
    `识别为 SFTP 文件采集类接口文档，共 ${groupCount} 个数据分组（含辅助 / 月 / 周 / 日 粒度）。`,
    `当前源端配置：${body.source.type} / ${body.source.name}`,
    `当前目标端配置：${body.target.type} / ${body.target.name}`,
  ]);

  const ans = [
    `📄 已解析「松果大数据接口文档（北京联通）」。\n`,
    `- 协议：SFTP（红松信息提供 SFTP 服务器，每月初将数据生成到约定目录）\n`,
    `- 数据分组：${groupCount} 个（含栅格说明 / 用户图层 / 漫入漫出 / 宽带数据 / 周新增 / 日新增 等）\n`,
    `- 文件命名：按 \`{group}_{YYYYMM | YYYYWW | YYYYMMDD}.csv\` 模板组织\n`,
    `- 目标库：将按"自动建表 + 追加数据"的方式写入 ${body.target.type} · ${body.target.name}\n\n`,
    `下一步我需要 SFTP 的连接信息（地址 / 用户名 / 密码 / 白名单 IP），请在下方表单填写。`,
  ].join('');
  await streamAnswer(stream, ans);

  await pushAction(stream, {
    id: nextId('act'),
    step: '校验源端 SFTP 连接信息',
    kind: 'info',
    status: 'fail',
    payload: { error: '文档中 SFTP 地址 / 用户名 / 密码字段为空' },
  });

  await pushLine(stream, {
    type: 'question',
    question: {
      id: 'sftp-conn',
      title: '补充 SFTP 连接信息',
      description:
        '文档原文中"SFTP 地址 / 用户名 / 密码"字段为空，请补充后我会继续后续步骤。',
      fields: [
        {
          key: 'host',
          label: 'SFTP 地址',
          type: 'text',
          required: true,
          placeholder: '如 sftp.hongsong.cn',
        },
        {
          key: 'port',
          label: '端口',
          type: 'number',
          required: false,
          defaultValue: 22,
        },
        {
          key: 'username',
          label: '用户名',
          type: 'text',
          required: true,
          placeholder: '红松信息分配的账号',
        },
        {
          key: 'password',
          label: '密码',
          type: 'password',
          required: true,
        },
        {
          key: 'whiteListIp',
          label: '白名单 IP（可选）',
          type: 'text',
          required: false,
          placeholder: '需要绑定的访问 IP',
        },
      ],
    },
  });
  await pushLine(stream, { type: 'done' });
}

async function runPineappleResumeStage(
  stream: any,
  body: ChatBody,
) {
  const answers = body.resumeContext?.answers ?? {};
  await streamThinking(stream, [
    '已收到用户补充的 SFTP 连接信息，开始执行在线封装。',
    '步骤 1：注册 SFTP 数据源（POST /datasources）',
    `步骤 2：为 ${PINEAPPLE_AUTO_PICK_GROUPS.length} 个核心数据分组分别创建结构化批量采集任务`,
    `步骤 3：同步反馈每条任务的创建结果`,
  ]);

  const datasourcePayload = planDataSourcePayload(body, answers);
  await pushAction(stream, {
    id: 'act-create-ds',
    step: `注册 SFTP 数据源（${datasourcePayload.host}:${datasourcePayload.port}）`,
    kind: 'create-datasource',
    status: 'pending',
    payload: {
      endpoint: 'POST /datasources',
      datasourcePayload,
    },
  });

  const groupsToBuild = PINEAPPLE_FIXTURE_GROUPS.filter((g) =>
    PINEAPPLE_AUTO_PICK_GROUPS.includes(g.name),
  );
  for (const g of groupsToBuild) {
    const taskPayload = planTaskPayload({
      body,
      groupName: g.name,
      fileNamePattern: g.fileNamePattern,
      granularity: g.granularity,
    });
    await pushAction(stream, {
      id: `act-task-${g.name}`,
      step: `创建采集任务：${g.name}`,
      kind: 'create-task',
      status: 'pending',
      payload: {
        endpoint: 'POST /projects/{code}/structured-batch-task/create-structured-batch',
        taskPayload,
      },
    });
    await sleep(ACTION_GAP_DELAY);
  }

  const summary = `✅ 已自动完成「松果大数据接口文档」的全部在线封装：\n\n- 注册 SFTP 数据源 1 个（地址 ${datasourcePayload.host}:${datasourcePayload.port}）\n- 创建结构化批量采集任务 ${groupsToBuild.length} 条（覆盖 ${groupsToBuild.map((g) => g.name).join('、')}）\n- 全部任务采用「自动建表 + 追加数据」写入 ${body.target.type} · ${body.target.name}\n\n你可以在右侧"执行轨迹"中点击对应链接，跳转到数据源管理 / 采集任务管理查看明细。后续如需开启调度，可在采集任务管理页面右侧操作列里启动。`;
  await streamAnswer(stream, summary);
  await pushLine(stream, { type: 'done' });
}

export default defineEventHandler(async (event) => {
  const body = await readBody<ChatBody>(event);
  const stream = createEventStream(event);

  // 立刻返回 stream 句柄以便客户端开始消费；下面的工作在后台异步进行。
  void (async () => {
    try {
      await pushLine(stream, {
        type: 'meta',
        conversationId: body.conversationId ?? `conv_${Date.now()}`,
      });

      // ① 缺参补全场景
      if (body.resumeContext?.questionId === 'sftp-conn') {
        await runPineappleResumeStage(stream, body);
        await stream.close();
        return;
      }

      // ② 带附件场景
      if (body.attachment?.docId) {
        const fixture = getParsedDoc(body.attachment.docId);
        if (fixture && fixture.detected.dataGroups.length > 0) {
          await runPineappleParseStage(
            stream,
            body,
            fixture.detected.dataGroups.length,
          );
        } else {
          await runUnknownDocFlow(stream, body);
        }
        await stream.close();
        return;
      }

      // ③ 普通问答
      await runFreeFormChat(stream, body);
      await stream.close();
    } catch (error) {
      try {
        await pushLine(stream, {
          type: 'error',
          message: (error as Error).message,
        });
        await stream.close();
      } catch {
        // ignore
      }
    }
  })();

  return stream.send();
});
