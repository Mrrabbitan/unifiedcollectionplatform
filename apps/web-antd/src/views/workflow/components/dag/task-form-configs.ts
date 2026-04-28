import type { VbenFormSchema } from '#/adapter/form';

export interface TaskFormConfig {
  baseFields: VbenFormSchema[];
  customFields: VbenFormSchema[];
}

const baseFieldsConfig: VbenFormSchema[] = [
  {
    component: 'Input',
    fieldName: 'name',
    label: '任务名称',
    rules: 'required',
    componentProps: {
      placeholder: '请输入任务名称',
      maxLength: 100,
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'description',
    label: '描述',
    componentProps: {
      placeholder: '请输入描述',
      rows: 3,
    },
  },
  {
    component: 'Select',
    fieldName: 'taskPriority',
    label: '任务优先级',
    defaultValue: 'MEDIUM',
    componentProps: {
      options: [
        { label: '最高', value: 'HIGHEST' },
        { label: '高', value: 'HIGH' },
        { label: '中', value: 'MEDIUM' },
        { label: '低', value: 'LOW' },
        { label: '最低', value: 'LOWEST' },
      ],
    },
  },
  {
    component: 'Input',
    fieldName: 'workerGroup',
    label: 'Worker分组',
    defaultValue: 'default',
    componentProps: {
      placeholder: '请输入Worker分组',
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'failRetryTimes',
    label: '失败重试次数',
    defaultValue: 0,
    componentProps: {
      min: 0,
      style: { width: '100%' },
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'failRetryInterval',
    label: '失败重试间隔(分钟)',
    defaultValue: 1,
    componentProps: {
      min: 1,
      style: { width: '100%' },
    },
  },
  {
    component: 'Switch',
    fieldName: 'timeoutFlag',
    label: '超时告警',
    defaultValue: false,
  },
  {
    component: 'InputNumber',
    fieldName: 'timeout',
    label: '超时时间(分钟)',
    defaultValue: 30,
    dependencies: {
      show: (values) => values.timeoutFlag === true || values.timeoutFlag === 'OPEN',
      triggerFields: ['timeoutFlag'],
    },
    componentProps: {
      min: 1,
      style: { width: '100%' },
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'delayTime',
    label: '延迟执行时间(分钟)',
    defaultValue: 0,
    componentProps: {
      min: 0,
      style: { width: '100%' },
    },
  },
];

const shellCustomFields: VbenFormSchema[] = [
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.rawScript',
    label: '脚本',
    rules: 'required',
    componentProps: {
      placeholder: '请输入Shell脚本',
      rows: 10,
      style: { fontFamily: 'monospace' },
    },
  },
  {
    component: 'Input',
    fieldName: 'resourceIds',
    label: '资源',
    componentProps: {
      placeholder: '请选择资源文件',
    },
  },
];

const sqlCustomFields: VbenFormSchema[] = [
  {
    component: 'Select',
    fieldName: 'taskParams.type',
    label: '数据源类型',
    defaultValue: 'MYSQL',
    componentProps: {
      options: [
        { label: 'MySQL', value: 'MYSQL' },
        { label: 'PostgreSQL', value: 'POSTGRESQL' },
        { label: 'Hive', value: 'HIVE' },
        { label: 'Spark', value: 'SPARK' },
        { label: 'ClickHouse', value: 'CLICKHOUSE' },
        { label: 'Oracle', value: 'ORACLE' },
        { label: 'SQL Server', value: 'SQLSERVER' },
        { label: 'DB2', value: 'DB2' },
      ],
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.datasource',
    label: '数据源',
    componentProps: {
      placeholder: '请选择数据源',
    },
  },
  {
    component: 'RadioGroup',
    fieldName: 'taskParams.sqlType',
    label: 'SQL类型',
    defaultValue: '0',
    componentProps: {
      options: [
        { label: '查询', value: '0' },
        { label: '非查询', value: '1' },
      ],
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.sql',
    label: 'SQL语句',
    rules: 'required',
    componentProps: {
      placeholder: '请输入SQL语句',
      rows: 10,
      style: { fontFamily: 'monospace' },
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'taskParams.displayRows',
    label: '显示行数',
    defaultValue: 10,
    componentProps: {
      min: 1,
      max: 100,
      style: { width: '100%' },
    },
  },
];

const pythonCustomFields: VbenFormSchema[] = [
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.rawScript',
    label: '脚本',
    rules: 'required',
    componentProps: {
      placeholder: '请输入Python脚本',
      rows: 10,
      style: { fontFamily: 'monospace' },
    },
  },
];

const sparkCustomFields: VbenFormSchema[] = [
  {
    component: 'Select',
    fieldName: 'taskParams.programType',
    label: '程序类型',
    defaultValue: 'SCALA',
    componentProps: {
      options: [
        { label: 'JAVA', value: 'JAVA' },
        { label: 'SCALA', value: 'SCALA' },
        { label: 'PYTHON', value: 'PYTHON' },
      ],
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.mainJar',
    label: '主Jar包',
    componentProps: {
      placeholder: '请选择或输入主Jar包路径',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.mainClass',
    label: '主类',
    componentProps: {
      placeholder: '请输入主类名',
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.deployMode',
    label: '部署模式',
    componentProps: {
      placeholder: '例如: cluster, client',
      rows: 2,
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.appName',
    label: '应用名称',
    componentProps: {
      placeholder: '请输入Spark应用名称',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.driverCores',
    label: 'Driver核心数',
    defaultValue: '1',
    componentProps: {
      placeholder: '请输入Driver核心数',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.driverMemory',
    label: 'Driver内存',
    defaultValue: '512M',
    componentProps: {
      placeholder: '例如: 512M, 1G',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.executorCores',
    label: 'Executor核心数',
    defaultValue: '1',
    componentProps: {
      placeholder: '请输入Executor核心数',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.executorMemory',
    label: 'Executor内存',
    defaultValue: '1G',
    componentProps: {
      placeholder: '例如: 1G, 2G',
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'taskParams.numExecutors',
    label: 'Executor数量',
    defaultValue: 1,
    componentProps: {
      min: 1,
      style: { width: '100%' },
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.mainArgs',
    label: '主程序参数',
    componentProps: {
      placeholder: '请输入主程序参数',
      rows: 3,
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.others',
    label: '其他参数',
    componentProps: {
      placeholder: '请输入其他Spark参数',
      rows: 3,
    },
  },
];

const flinkCustomFields: VbenFormSchema[] = [
  {
    component: 'Select',
    fieldName: 'taskParams.programType',
    label: '程序类型',
    defaultValue: 'SCALA',
    componentProps: {
      options: [
        { label: 'JAVA', value: 'JAVA' },
        { label: 'SCALA', value: 'SCALA' },
        { label: 'PYTHON', value: 'PYTHON' },
      ],
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.mainJar',
    label: '主Jar包',
    componentProps: {
      placeholder: '请选择或输入主Jar包路径',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.mainClass',
    label: '主类',
    componentProps: {
      placeholder: '请输入主类名',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.deployMode',
    label: '部署模式',
    defaultValue: 'cluster',
    componentProps: {
      placeholder: '例如: cluster, application',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.flinkVersion',
    label: 'Flink版本',
    componentProps: {
      placeholder: '例如: 1.15, 1.16',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.jobManagerMemory',
    label: 'JobManager内存',
    defaultValue: '1G',
    componentProps: {
      placeholder: '例如: 1G, 2G',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.taskManagerMemory',
    label: 'TaskManager内存',
    defaultValue: '1G',
    componentProps: {
      placeholder: '例如: 1G, 2G',
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'taskParams.slot',
    label: 'Slot数量',
    defaultValue: 1,
    componentProps: {
      min: 1,
      style: { width: '100%' },
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'taskParams.taskManager',
    label: 'TaskManager数量',
    defaultValue: 1,
    componentProps: {
      min: 1,
      style: { width: '100%' },
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.mainArgs',
    label: '主程序参数',
    componentProps: {
      placeholder: '请输入主程序参数',
      rows: 3,
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.others',
    label: '其他参数',
    componentProps: {
      placeholder: '请输入其他Flink参数',
      rows: 3,
    },
  },
];

const httpCustomFields: VbenFormSchema[] = [
  {
    component: 'Input',
    fieldName: 'taskParams.url',
    label: '请求地址',
    rules: 'required',
    componentProps: {
      placeholder: '请输入请求URL',
    },
  },
  {
    component: 'Select',
    fieldName: 'taskParams.httpMethod',
    label: '请求方式',
    defaultValue: 'GET',
    componentProps: {
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
      ],
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.httpParams',
    label: '请求参数',
    componentProps: {
      placeholder: '请输入请求参数(JSON格式)',
      rows: 5,
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.httpCheckCondition',
    label: '校验条件',
    componentProps: {
      placeholder: '请输入校验条件',
      rows: 3,
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'taskParams.connectTimeout',
    label: '连接超时(秒)',
    defaultValue: 60,
    componentProps: {
      min: 1,
      style: { width: '100%' },
    },
  },
];

const dataxCustomFields: VbenFormSchema[] = [
  {
    component: 'Input',
    fieldName: 'taskParams.customConfig',
    label: '自定义配置',
    defaultValue: '0',
    componentProps: {
      placeholder: '0:JSON配置, 1:向导模式',
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.json',
    label: 'JSON配置',
    componentProps: {
      placeholder: '请输入DataX JSON配置',
      rows: 15,
      style: { fontFamily: 'monospace' },
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.dsType',
    label: '源数据源类型',
    componentProps: {
      placeholder: '请选择源数据源类型',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.dataSource',
    label: '源数据源',
    componentProps: {
      placeholder: '请选择源数据源',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.dtType',
    label: '目标数据源类型',
    componentProps: {
      placeholder: '请选择目标数据源类型',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.dataTarget',
    label: '目标数据源',
    componentProps: {
      placeholder: '请选择目标数据源',
    },
  },
];

const subWorkflowCustomFields: VbenFormSchema[] = [
  {
    component: 'Input',
    fieldName: 'taskParams.workflowDefinitionCode',
    label: '子工作流',
    rules: 'required',
    componentProps: {
      placeholder: '请选择子工作流',
    },
  },
];

const conditionsCustomFields: VbenFormSchema[] = [
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.conditionResult',
    label: '条件配置',
    componentProps: {
      placeholder: '请配置条件分支',
      rows: 10,
    },
  },
];

const dependentCustomFields: VbenFormSchema[] = [
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.dependence',
    label: '依赖配置',
    componentProps: {
      placeholder: '请配置任务依赖',
      rows: 10,
    },
  },
];

const procedureCustomFields: VbenFormSchema[] = [
  {
    component: 'Select',
    fieldName: 'taskParams.type',
    label: '数据源类型',
    defaultValue: 'MYSQL',
    componentProps: {
      options: [
        { label: 'MySQL', value: 'MYSQL' },
        { label: 'PostgreSQL', value: 'POSTGRESQL' },
        { label: 'Oracle', value: 'ORACLE' },
        { label: 'SQL Server', value: 'SQLSERVER' },
      ],
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.datasource',
    label: '数据源',
    componentProps: {
      placeholder: '请选择数据源',
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.procedure',
    label: '存储过程',
    rules: 'required',
    componentProps: {
      placeholder: '请输入存储过程调用语句',
      rows: 5,
    },
  },
];

const seatunnelCustomFields: VbenFormSchema[] = [
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.config',
    label: 'SeaTunnel配置',
    componentProps: {
      placeholder: '请输入SeaTunnel配置(HOCON格式)',
      rows: 15,
      style: { fontFamily: 'monospace' },
    },
  },
];

const sqoopCustomFields: VbenFormSchema[] = [
  {
    component: 'Select',
    fieldName: 'taskParams.modelType',
    label: '模式',
    defaultValue: 'import',
    componentProps: {
      options: [
        { label: '导入(import)', value: 'import' },
        { label: '导出(export)', value: 'export' },
      ],
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.sourceType',
    label: '源类型',
    componentProps: {
      placeholder: '请选择源类型',
    },
  },
  {
    component: 'Input',
    fieldName: 'taskParams.targetType',
    label: '目标类型',
    componentProps: {
      placeholder: '请选择目标类型',
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.concurrency',
    label: '并发数',
    componentProps: {
      placeholder: '请输入并发数',
      rows: 2,
    },
  },
];

const remoteShellCustomFields: VbenFormSchema[] = [
  {
    component: 'Select',
    fieldName: 'taskParams.datasource',
    label: '数据源',
    rules: 'required',
    componentProps: {
      options: [
        { label: 'SSH', value: 'SSH' },
      ],
      placeholder: '请选择SSH数据源',
    },
  },
  {
    component: 'InputTextArea',
    fieldName: 'taskParams.rawScript',
    label: '脚本',
    rules: 'required',
    componentProps: {
      placeholder: '请输入要执行的脚本',
      rows: 10,
      style: { fontFamily: 'monospace' },
    },
  },
];

export const taskFormConfigs: Record<string, TaskFormConfig> = {
  SHELL: {
    baseFields: baseFieldsConfig,
    customFields: shellCustomFields,
  },
  SQL: {
    baseFields: baseFieldsConfig,
    customFields: sqlCustomFields,
  },
  PYTHON: {
    baseFields: baseFieldsConfig,
    customFields: pythonCustomFields,
  },
  SPARK: {
    baseFields: baseFieldsConfig,
    customFields: sparkCustomFields,
  },
  FLINK: {
    baseFields: baseFieldsConfig,
    customFields: flinkCustomFields,
  },
  FLINK_STREAM: {
    baseFields: baseFieldsConfig,
    customFields: flinkCustomFields,
  },
  HTTP: {
    baseFields: baseFieldsConfig,
    customFields: httpCustomFields,
  },
  DATAX: {
    baseFields: baseFieldsConfig,
    customFields: dataxCustomFields,
  },
  SUB_WORKFLOW: {
    baseFields: baseFieldsConfig,
    customFields: subWorkflowCustomFields,
  },
  CONDITIONS: {
    baseFields: baseFieldsConfig,
    customFields: conditionsCustomFields,
  },
  DEPENDENT: {
    baseFields: baseFieldsConfig,
    customFields: dependentCustomFields,
  },
  PROCEDURE: {
    baseFields: baseFieldsConfig,
    customFields: procedureCustomFields,
  },
  SEATUNNEL: {
    baseFields: baseFieldsConfig,
    customFields: seatunnelCustomFields,
  },
  SQOOP: {
    baseFields: baseFieldsConfig,
    customFields: sqoopCustomFields,
  },
  REMOTESHELL: {
    baseFields: baseFieldsConfig,
    customFields: remoteShellCustomFields,
  },
};

export function getTaskFormSchema(taskType: string): VbenFormSchema[] {
  const config = taskFormConfigs[taskType] ?? taskFormConfigs.SHELL!;
  return [...config.baseFields, ...config.customFields];
}
