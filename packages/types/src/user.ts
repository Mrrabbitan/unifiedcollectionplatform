

/** 用户信息 */
interface UserInfo  {
  /** 用户ID */
  id: number;
  
  /** 用户名 */
  userName: string;
  
  /** 用户密码 (可能为 null) */
  userPassword: string | null;
  
  /** 邮箱 */
  email: string;
  
  /** 手机号 (当前为空字符串) */
  phone: string;
  
  /** 用户类型，例如 'ADMIN_USER' */
  userType: string; 
  // 如果类型固定，也可以写成字面量联合类型: 'ADMIN_USER' | 'NORMAL_USER' | ...
  
  /** 租户ID */
  tenantId: number;
  
  /** 状态 (1: 正常, 0: 禁用 等) */
  state: number;
  
  /** 租户编码 */
  tenantCode: string;
  
  /** 队列名称 (可能为 null) */
  queueName: string | null;
  
  /** 告警组 (可能为 null) */
  alertGroup: string | null;
  
  /** 队列名称 (中文显示用) */
  queue: string;
  
  /** 时区 */
  timeZone: string;
  
  /** 创建时间 (格式: YYYY-MM-DD HH:mm:ss) */
  createTime: string;
  
  /** 更新时间 (格式: YYYY-MM-DD HH:mm:ss) */
  updateTime: string;
  
  /** 首页路径 */
  homePath: string;
}

export type { UserInfo };
