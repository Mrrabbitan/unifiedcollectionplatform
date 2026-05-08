/**
 * Fixture data for the AI Q&A demo.
 *
 * 当用户上传"松果大数据接口文档-北京联通"或类似命名/内容的 docx，
 * `parse-docx.post.ts` 会返回这份 fixture。聊天接口 `chat.post.ts`
 * 据此输出"思考过程 + 缺参引导 + 自动落库动作"的演示剧本。
 *
 * 真实环境下，这部分应换成后端调用 LLM + 文档抽取得到。
 */

export interface FixtureField {
  name: string;
  type?: string;
  comment?: string;
}

export interface FixtureGroup {
  name: string;
  granularity: string;
  description?: string;
  fileNamePattern?: string;
  fields?: FixtureField[];
}

export const PINEAPPLE_DOC_TITLE = '松果大数据接口文档 - 北京联通';

export const PINEAPPLE_FIXTURE_GROUPS: FixtureGroup[] = [
  {
    name: '栅格说明',
    granularity: '辅助',
    description:
      '栅格 ID 由左下角麦卡托坐标除以 50 拼接而成，所有原始数据按栅格组织。',
    fileNamePattern: 'grid_meta_*.csv',
    fields: [
      { name: 'grid_id', type: 'STRING', comment: '栅格 ID' },
      { name: 'mercator_x', type: 'BIGINT', comment: '左下角麦卡托 X' },
      { name: 'mercator_y', type: 'BIGINT', comment: '左下角麦卡托 Y' },
    ],
  },
  {
    name: '边界数据与栅格对应',
    granularity: '辅助',
    description: '行政区/场景边界与栅格 ID 对应表，用于按场景统计。',
    fileNamePattern: 'boundary_grid_*.csv',
    fields: [
      { name: 'grid_id', type: 'STRING' },
      { name: 'region_code', type: 'STRING' },
      { name: 'scene', type: 'STRING' },
    ],
  },
  {
    name: '用户图层（月）',
    granularity: '月',
    description: '按月统计的栅格用户数。',
    fileNamePattern: 'user_layer_month_${YYYYMM}.csv',
    fields: [
      { name: 'grid_id', type: 'STRING' },
      { name: 'month', type: 'STRING' },
      { name: 'user_count', type: 'BIGINT' },
    ],
  },
  {
    name: '用户新增栅格（月）',
    granularity: '月',
    fileNamePattern: 'user_new_grid_${YYYYMM}.csv',
    fields: [
      { name: 'grid_id', type: 'STRING' },
      { name: 'month', type: 'STRING' },
      { name: 'new_user_count', type: 'BIGINT' },
    ],
  },
  {
    name: '漫入统计（月）',
    granularity: '月',
    fileNamePattern: 'roam_in_${YYYYMM}.csv',
  },
  {
    name: '漫出统计（月）',
    granularity: '月',
    fileNamePattern: 'roam_out_${YYYYMM}.csv',
  },
  {
    name: '覆盖图层（月）',
    granularity: '月',
    fileNamePattern: 'coverage_${YYYYMM}.csv',
  },
  {
    name: '宽带栅格数据',
    granularity: '月',
    fileNamePattern: 'broadband_grid_${YYYYMM}.csv',
  },
  {
    name: '宽带行政村数据',
    granularity: '月',
    fileNamePattern: 'broadband_village_${YYYYMM}.csv',
  },
  {
    name: '宽带场景数据',
    granularity: '月',
    fileNamePattern: 'broadband_scene_${YYYYMM}.csv',
  },
  {
    name: '周新增栅格（周）',
    granularity: '周',
    fileNamePattern: 'weekly_new_grid_${YYYYWW}.csv',
  },
  {
    name: '场景新增统计（周）',
    granularity: '周',
    fileNamePattern: 'weekly_new_scene_${YYYYWW}.csv',
  },
  {
    name: '日新增用户（日）',
    granularity: '日',
    fileNamePattern: 'daily_new_user_${YYYYMMDD}.csv',
  },
  {
    name: '场景新增统计（日）',
    granularity: '日',
    fileNamePattern: 'daily_new_scene_${YYYYMMDD}.csv',
  },
];

/** 默认情况下，AI 自动建任务时只挑 5 条出来，避免演示太长。 */
export const PINEAPPLE_AUTO_PICK_GROUPS = [
  '栅格说明',
  '用户图层（月）',
  '用户新增栅格（月）',
  '日新增用户（日）',
  '场景新增统计（日）',
];

export interface ParsedDocFixture {
  docId: string;
  fileName: string;
  size: number;
  title: string;
  summary: string;
  detected: {
    protocol: 'sftp';
    vendor: string;
    missingFields: string[];
    dataGroups: Array<{
      name: string;
      granularity?: string;
      description?: string;
      fields?: FixtureField[];
    }>;
    rawTextPreview: string;
  };
}

export function buildPineappleFixture(
  fileName: string,
  size: number,
  rawTextPreview: string,
): ParsedDocFixture {
  return {
    docId: `pineapple_${Date.now()}`,
    fileName,
    size,
    title: PINEAPPLE_DOC_TITLE,
    summary: `识别为 SFTP 文件采集类接口文档，共 ${PINEAPPLE_FIXTURE_GROUPS.length} 个数据分组（含辅助、月、周、日）。`,
    detected: {
      protocol: 'sftp',
      vendor: '南京红松信息科技 / 北京联通',
      missingFields: ['host', 'username', 'password'],
      dataGroups: PINEAPPLE_FIXTURE_GROUPS.map((g) => ({
        name: g.name,
        granularity: g.granularity,
        description: g.description,
        fields: g.fields,
      })),
      rawTextPreview,
    },
  };
}

/** 用于不带 fixture 时的简化 dataGroups。 */
export function buildGenericFixture(
  fileName: string,
  size: number,
  rawTextPreview: string,
): ParsedDocFixture {
  return {
    docId: `unknown_${Date.now()}`,
    fileName,
    size,
    title: fileName.replace(/\.docx?$/i, ''),
    summary: '已读取文档纯文本，但未识别为标准接口文档，将以普通问答模式回答。',
    detected: {
      protocol: 'sftp',
      vendor: '未知',
      missingFields: [],
      dataGroups: [],
      rawTextPreview,
    },
  };
}
