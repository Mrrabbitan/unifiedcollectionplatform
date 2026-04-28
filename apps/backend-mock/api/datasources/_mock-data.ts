/**
 * 共享给 datasources/* 路由的 mock 数据。
 *
 * 这里精确植入 AI 助手 demo 用到的两条 MySQL 数据源
 * (host=10.177.64.38 / name=zb_cjzh_realtime)，让回填后表单的
 * 「源端数据源 / 目标端数据源」下拉能直接命中并选中。
 */

export interface MockColumnInfo {
  name: string;
  type: string;
  primaryKey?: boolean;
  comment?: string;
}

export interface MockDataSourceMeta {
  tableName: string;
  columnNames: string[];
  columnsInfo?: MockColumnInfo[];
}

export interface MockDataSource {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  userName: string;
  note: string;
  createTime: string;
  updateTime: string;
  metas: MockDataSourceMeta[];
}

const NOW = '2026-04-28 10:00:00';

const SRC_SYS_BAK_COLUMNS: MockColumnInfo[] = [
  { name: 'id', type: 'BIGINT', primaryKey: true, comment: '主键' },
  { name: 'sys_code', type: 'VARCHAR(64)', comment: '系统编码' },
  { name: 'sys_name', type: 'VARCHAR(128)', comment: '系统名称' },
  { name: 'status', type: 'TINYINT', comment: '状态' },
  { name: 'gmt_create', type: 'DATETIME', comment: '创建时间' },
  { name: 'gmt_modified', type: 'DATETIME', comment: '更新时间' },
];

const USER_TABLE_COLUMNS: MockColumnInfo[] = [
  { name: 'id', type: 'BIGINT', primaryKey: true },
  { name: 'name', type: 'VARCHAR(64)' },
  { name: 'email', type: 'VARCHAR(128)' },
];

const ORDER_TABLE_COLUMNS: MockColumnInfo[] = [
  { name: 'id', type: 'BIGINT', primaryKey: true },
  { name: 'amount', type: 'DECIMAL(18,2)' },
  { name: 'create_time', type: 'DATETIME' },
];

export const MOCK_DATASOURCES: MockDataSource[] = [
  {
    id: 1001,
    name: 'src_mysql_38',
    type: 'MYSQL',
    host: '10.177.64.38',
    port: 3306,
    database: 'src_db',
    userName: 'root',
    note: '源端 MySQL（10.177.64.38）',
    createTime: NOW,
    updateTime: NOW,
    metas: [
      {
        tableName: 'src_sys_bak',
        columnNames: SRC_SYS_BAK_COLUMNS.map((c) => c.name),
        columnsInfo: SRC_SYS_BAK_COLUMNS,
      },
      {
        tableName: 'user',
        columnNames: USER_TABLE_COLUMNS.map((c) => c.name),
        columnsInfo: USER_TABLE_COLUMNS,
      },
      {
        tableName: 'order',
        columnNames: ORDER_TABLE_COLUMNS.map((c) => c.name),
        columnsInfo: ORDER_TABLE_COLUMNS,
      },
    ],
  },
  {
    id: 1002,
    name: 'zb_cjzh_realtime',
    type: 'MYSQL',
    host: '10.177.64.40',
    port: 3306,
    database: 'zb_cjzh_realtime',
    userName: 'root',
    note: '目标端 MySQL（zb_cjzh_realtime）',
    createTime: NOW,
    updateTime: NOW,
    metas: [],
  },
  {
    id: 1003,
    name: 'demo_maxcompute',
    type: 'MAXCOMPUTE',
    host: 'service.cn-hangzhou.maxcompute.aliyun.com',
    port: 443,
    database: 'demo_project',
    userName: '',
    note: '占位 MaxCompute，避免 MaxCompute 目标页崩溃',
    createTime: NOW,
    updateTime: NOW,
    metas: [],
  },
  {
    id: 1004,
    name: 'demo_sftp',
    type: 'SFTP',
    host: '10.177.64.50',
    port: 22,
    database: '',
    userName: 'sftp',
    note: '占位 SFTP，避免 SFTP 源端页崩溃',
    createTime: NOW,
    updateTime: NOW,
    metas: [],
  },
];

export function findDataSourceById(id: number): MockDataSource | undefined {
  return MOCK_DATASOURCES.find((d) => d.id === id);
}
