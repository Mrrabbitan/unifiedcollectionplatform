import { requestClient } from '#/api/request';

import type { PageInfo } from '#/types/page';

export interface DataSourceInfo {
  id: number;
  name: string;
  userName: string;
  type: string;
  host: string;
  port: number;
  database: string;
  note: string;
  createTime: string;
  updateTime: string;
  connectionParams?: Record<string, any> | string;
  principal?: string;
  javaSecurityKrb5Conf?: string;
  loginUserKeytabUsername?: string;
  loginUserKeytabPath?: string;
  mode?: string;
  connectType?: string;
  other?: Record<string, any> | string;
  endpoint?: string;
  restEndpoint?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  regionId?: string;
  awsRegion?: string;
  MSIClientId?: string;
  dbUser?: string;
  datawarehouse?: string;
  accessId?: string;
  accessKey?: string;
  privateKey?: string;
  namespace?: string;
  kubeConfig?: string;
  compatibleMode?: string;
  tunnelEndpoint?: string;
  project?: string;
  saslMechanism?: string;
  securityProtocol?: string;
  saslJaasConfig?: string;
  schemaRegistryUrl?: string;
  catalogType?: string;
  warehouse?: string;
  catalogUri?: string;
}

export interface DataSourceCreateParams {
  name: string;
  type: string;
  host?: string;
  port?: number;
  database?: string;
  userName?: string;
  password?: string;
  note?: string;
  principal?: string;
  javaSecurityKrb5Conf?: string;
  loginUserKeytabUsername?: string;
  loginUserKeytabPath?: string;
  mode?: string;
  connectType?: string;
  other?: string;
  endpoint?: string;
  restEndpoint?: string;
  accessKeyId?: string;
  accessKeySecret?: string;
  regionId?: string;
  awsRegion?: string;
  MSIClientId?: string;
  dbUser?: string;
  datawarehouse?: string;
  accessId?: string;
  accessKey?: string;
  privateKey?: string;
  namespace?: string;
  kubeConfig?: string;
  compatibleMode?: string;
  tunnelEndpoint?: string;
  project?: string;
  saslMechanism?: string;
  securityProtocol?: string;
  saslJaasConfig?: string;
  schemaRegistryUrl?: string;
  catalogType?: string;
  warehouse?: string;
  catalogUri?: string;
}

export async function getDataSourceListApi(pageNo: number, pageSize: number, searchVal: string) {
  return requestClient.get<PageInfo<DataSourceInfo>>('/datasources', {
    params: { pageNo, pageSize, searchVal },
  });
}

export async function getDataSourceDetailApi(id: number) {
  return requestClient.get<DataSourceInfo>(`/datasources/${id}`);
}

export async function getDataSourceConnectionParamsApi(id: number) {
  return requestClient.get<DataSourceInfo>(`/datasources/detail/${id}`);
}

export async function createDataSourceApi(params: DataSourceCreateParams) {
  return requestClient.post<DataSourceInfo>('/datasources', params);
}

export async function updateDataSourceApi(id: number, params: DataSourceCreateParams) {
  return requestClient.put<DataSourceInfo>(`/datasources/${id}`, params);
}

export async function deleteDataSourceApi(id: number) {
  return requestClient.delete<boolean>(`/datasources/${id}`);
}

export async function testConnectionApi(params: DataSourceCreateParams) {
  return requestClient.post<boolean>('/datasources/connect', params);
}

export interface DataSourceMeta {
  tableName: string;
  columnNames: string[];
}

export async function getMetasApi(datasourceId: number, pageNo: number, pageSize: number) {
  return requestClient.get<PageInfo<DataSourceMeta>>('/datasources/metas', {
    params: { datasourceId, pageNo, pageSize },
  });
}

export async function syncMetas(datasourceId: number) {
  return requestClient.get<string>('/datasources/syncMetas', {
    params: { datasourceId },
  });
}

export async function getDataSourceList(type: string) {
  return requestClient.get<DataSourceInfo[]>('/datasources/list', {
    params: { type },
  });
}

export async function getMetasList(datasourceId: number) {
  return requestClient.get<DataSourceMeta[]>('/datasources/metas/list', {
    params: { datasourceId },
  });
}

export async function getTableColumns(datasourceId: number, tableName: string, database?: string) {
  return requestClient.get<string[]>('/datasources/tableColumns/cache', {
    params: { datasourceId, tableName, database },
  });
}

export interface ColumnInfo {
  name: string;
  type: string;
  primaryKey: boolean;
}

export async function getTableColumnsInfo(datasourceId: number, tableName: string, database?: string) {
  return requestClient.get<ColumnInfo[]>('/datasources/tableColumnsInfo', {
    params: { datasourceId, tableName, database },
  });
}

