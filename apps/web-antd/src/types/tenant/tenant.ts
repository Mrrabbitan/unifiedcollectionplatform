interface TenantInfo {
  id: number;
  tenantCode: string;
  description: string;
  queueId: string;
  queueName: string;
  createTime: string;
  updateTime: string;
}

interface QueueInfo {
  id: number;
  queue: string;
  queueName: string;
  updateTime: string;
  createTime:string;
}

interface UserInfo {
  id: number;
  userName: string;
  userPassword: string;
  userType: number;
  email: string;
  phone: string;
  tenantId: number;
  createTime: string;
  updateTime: string;
  queue: string;
  state: number;
  timeZone: string;
  homePath: string;
}

export type {TenantInfo, QueueInfo, UserInfo}
