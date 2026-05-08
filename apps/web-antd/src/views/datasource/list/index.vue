<script lang="ts" setup>
import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { VxeGridPropTypes } from 'vxe-table';

import { computed, ref, h, watch, nextTick } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import {
  DeleteOutlined,
  EditOutlined,
  TableOutlined,
} from '@ant-design/icons-vue';
import { $t } from '@vben/locales';

import { Button, Card, message, Modal, Tag, Popover, Tabs, TabPane, Table, Spin, Pagination, Popconfirm, Space, Tooltip } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useVbenForm } from '#/adapter/form';

import {
  getDataSourceListApi,
  getDataSourceDetailApi,
  createDataSourceApi,
  updateDataSourceApi,
  deleteDataSourceApi,
  testConnectionApi,
  getMetasApi,
  syncMetas,
  type DataSourceInfo,
  type DataSourceCreateParams,
  type DataSourceMeta,
} from '#/api/datasource/datasource';

interface DataSourceType {
  value: string;
  label: string;
  defaultPort: number;
  category: string;
}

const datasourceCategories = {
  relational: {
    label: $t('datasource.new.categoryRelational'),
    types: ['MYSQL', 'POSTGRESQL', 'ORACLE', 'SQLSERVER', 'DB2', 'DAMENG', 'OCEANBASE', 'AZURESQL', 'SNOWFLAKE', 'HANA', 'DATABEND']
  },
  bigdata: {
    label: $t('datasource.new.categoryBigdata'),
    types: ['HIVE', 'CLICKHOUSE', 'DORIS', 'STARROCKS', 'REDSHIFT', 'VERTICA', 'DOLPHINDB', 'KAFKA', 'PAIMON']
  },
  compute: {
    label: $t('datasource.new.categoryCompute'),
    types: ['SPARK', 'KYUUBI', 'PRESTO', 'TRINO', 'ATHENA', 'ALIYUN_SERVERLESS_SPARK', 'MAXCOMPUTE', 'SAGEMAKER']
  },
  protocol: {
    label: $t('datasource.new.categoryProtocol'),
    types: ['SSH', 'SFTP', 'ZEPPELIN', 'K8S']
  }
};

const datasourceTypes: DataSourceType[] = [
  { value: 'MYSQL', label: 'MySQL', defaultPort: 3306, category: 'relational' },
  { value: 'POSTGRESQL', label: 'PostgreSQL', defaultPort: 5432, category: 'relational' },
  { value: 'ORACLE', label: 'Oracle', defaultPort: 1521, category: 'relational' },
  { value: 'SQLSERVER', label: 'SQL Server', defaultPort: 1433, category: 'relational' },
  { value: 'DB2', label: 'DB2', defaultPort: 50000, category: 'relational' },
  { value: 'DAMENG', label: 'Dameng', defaultPort: 5236, category: 'relational' },
  { value: 'OCEANBASE', label: 'OceanBase', defaultPort: 2881, category: 'relational' },
  { value: 'AZURESQL', label: 'Azure SQL', defaultPort: 1433, category: 'relational' },
  { value: 'SNOWFLAKE', label: 'Snowflake', defaultPort: 3306, category: 'relational' },
  { value: 'HANA', label: 'SAP HANA', defaultPort: 30015, category: 'relational' },
  { value: 'DATABEND', label: 'Databend', defaultPort: 8000, category: 'relational' },
  { value: 'HIVE', label: 'Hive/Impala', defaultPort: 10000, category: 'bigdata' },
  { value: 'CLICKHOUSE', label: 'ClickHouse', defaultPort: 8123, category: 'bigdata' },
  { value: 'DORIS', label: 'Doris', defaultPort: 9030, category: 'bigdata' },
  { value: 'STARROCKS', label: 'StarRocks', defaultPort: 9030, category: 'bigdata' },
  { value: 'REDSHIFT', label: 'Redshift', defaultPort: 5439, category: 'bigdata' },
  { value: 'VERTICA', label: 'Vertica', defaultPort: 5433, category: 'bigdata' },
  { value: 'DOLPHINDB', label: 'DolphinDB', defaultPort: 8848, category: 'bigdata' },
  { value: 'SPARK', label: 'Spark', defaultPort: 10015, category: 'compute' },
  { value: 'KYUUBI', label: 'Kyuubi', defaultPort: 10000, category: 'compute' },
  { value: 'PRESTO', label: 'Presto', defaultPort: 8080, category: 'compute' },
  { value: 'TRINO', label: 'Trino', defaultPort: 8080, category: 'compute' },
  { value: 'ATHENA', label: 'Athena', defaultPort: 0, category: 'compute' },
  { value: 'ALIYUN_SERVERLESS_SPARK', label: 'Aliyun Serverless Spark', defaultPort: 0, category: 'compute' },
  { value: 'MAXCOMPUTE', label: 'MaxCompute', defaultPort: 8080, category: 'compute' },
  { value: 'SAGEMAKER', label: 'SageMaker', defaultPort: 0, category: 'compute' },
  { value: 'KAFKA', label: 'Kafka', defaultPort: 9092, category: 'bigdata' },
  { value: 'PAIMON', label: 'Paimon', defaultPort: 8020, category: 'bigdata' },
  { value: 'SSH', label: 'SSH', defaultPort: 22, category: 'protocol' },
  { value: 'SFTP', label: 'SFTP', defaultPort: 22, category: 'protocol' },
  { value: 'ZEPPELIN', label: 'Zeppelin', defaultPort: 8080, category: 'protocol' },
  { value: 'K8S', label: 'Kubernetes', defaultPort: 6443, category: 'protocol' },
];

const editId = ref<number>();
const selectType = ref<string>('MYSQL');
const showTypeModal = ref(false);
const activeCategory = ref<string>('relational');
const currentMode = ref<string>('');
const testing = ref(false);
const showMetaModal = ref(false);
const metaLoading = ref(false);
const syncLoading = ref(false);
const metaList = ref<DataSourceMeta[]>([]);
const metaTotal = ref(0);
const metaPageNo = ref(1);
const metaPageSize = ref(10);
const currentMetaDataSource = ref<DataSourceInfo | null>(null);

const metaColumns = [
  {
    title: $t('datasource.new.metaTableName'),
    dataIndex: 'tableName',
    key: 'tableName',
    width: 200,
  },
  {
    title: $t('datasource.new.metaColumnNames'),
    dataIndex: 'columnNames',
    key: 'columnNames',
    customRender: ({ text }: { text: string[] }) => {
      return text?.join(', ') || '-';
    },
  },
];

const formState = ref({
  showHost: true,
  showPort: true,
  showDatabase: true,
  requiredDatabase: true,
  showUserName: true,
  showPassword: true,
  showJdbcParams: true,
  showPrincipal: false,
  showConnectType: false,
  showMode: false,
  showRestEndpoint: false,
  showAccessKeyId: false,
  showAccessKeySecret: false,
  showRegionId: false,
  showEndpoint: false,
  showAwsRegion: false,
  showPrivateKey: false,
  requiredPrivateKey: false,
  showNamespace: false,
  showKubeConfig: false,
  showAccess: false,
  showDatawarehouse: false,
  showCompatibleMode: false,
  showKeytab: false,
  showDbUser: false,
  showMSIClientId: false,
  showOAuthEndpoint: false,
  showTunnelEndpoint: false,
  showSaslMechanism: false,
  showSecurityProtocol: false,
  showSaslJaasConfig: false,
  showSchemaRegistryUrl: false,
  showCatalogType: false,
  showWarehouse: false,
  showCatalogUri: false,
});

const modeOptions = [
  { label: 'SqlPassword', value: 'SqlPassword' },
  { label: 'ActiveDirectoryPassword', value: 'ActiveDirectoryPassword' },
  { label: 'ActiveDirectoryMSI', value: 'ActiveDirectoryMSI' },
  { label: 'ActiveDirectoryServicePrincipal', value: 'ActiveDirectoryServicePrincipal' },
  { label: 'accessToken', value: 'accessToken' },
];

const redshiftModeOptions = [
  { label: 'password', value: 'password' },
  { label: 'IAM-accessKey', value: 'IAM-accessKey' },
];

const sagemakerModeOption = [
  { label: 'IAM-accessKey', value: 'IAM-accessKey' },
];

function getDatasourceTypeLabel(type: string): string {
  const found = datasourceTypes.find((item) => item.value === type);
  return found?.label || type;
}

function getDatasourceTypeDefaultPort(type: string): number {
  const found = datasourceTypes.find((item) => item.value === type);
  return found?.defaultPort || 3306;
}

function updateFormState(type: string) {
  formState.value.showHost = !['ATHENA', 'SAGEMAKER', 'K8S', 'ALIYUN_SERVERLESS_SPARK', 'ZEPPELIN', 'MAXCOMPUTE', 'PAIMON'].includes(type);
  formState.value.showPort = !['ATHENA', 'SAGEMAKER', 'K8S', 'ALIYUN_SERVERLESS_SPARK', 'ZEPPELIN', 'MAXCOMPUTE', 'KAFKA', 'PAIMON'].includes(type);
  formState.value.requiredDatabase = !['POSTGRESQL', 'ATHENA', 'SSH', 'ZEPPELIN', 'SAGEMAKER', 'K8S', 'ALIYUN_SERVERLESS_SPARK', 'DOLPHINDB', 'SFTP', 'KAFKA', 'PAIMON'].includes(type);
  formState.value.showDatabase = !['SSH', 'ZEPPELIN', 'SAGEMAKER', 'K8S', 'ALIYUN_SERVERLESS_SPARK', 'DOLPHINDB', 'SFTP', 'KAFKA', 'PAIMON'].includes(type);
  formState.value.showJdbcParams = !['SSH', 'ZEPPELIN', 'SAGEMAKER', 'K8S', 'ALIYUN_SERVERLESS_SPARK', 'SFTP', 'KAFKA', 'PAIMON'].includes(type);
  formState.value.showPrincipal = ['HIVE', 'SPARK'].includes(type);
  formState.value.showConnectType = type === 'ORACLE';
  formState.value.showMode = ['AZURESQL', 'REDSHIFT', 'SAGEMAKER'].includes(type);
  formState.value.showRestEndpoint = type === 'ZEPPELIN';
  formState.value.showAccessKeyId = type === 'ALIYUN_SERVERLESS_SPARK';
  formState.value.showAccessKeySecret = type === 'ALIYUN_SERVERLESS_SPARK';
  formState.value.showRegionId = type === 'ALIYUN_SERVERLESS_SPARK';
  formState.value.showEndpoint = type === 'ALIYUN_SERVERLESS_SPARK' || type === 'MAXCOMPUTE';
  formState.value.showAwsRegion = ['ATHENA', 'SAGEMAKER'].includes(type);
  formState.value.showPrivateKey = ['SSH', 'SFTP'].includes(type);
  formState.value.requiredPrivateKey = type === 'SSH';
  formState.value.showNamespace = type === 'K8S';
  formState.value.showKubeConfig = type === 'K8S';
  formState.value.showAccess = type === 'MAXCOMPUTE';
  formState.value.showDatawarehouse = type === 'SNOWFLAKE';
  formState.value.showCompatibleMode = type === 'OCEANBASE';
  formState.value.showKeytab = ['HIVE', 'SPARK'].includes(type);
  formState.value.showTunnelEndpoint = type === 'MAXCOMPUTE';
  
  formState.value.showSaslMechanism = type === 'KAFKA';
  formState.value.showSecurityProtocol = type === 'KAFKA';
  formState.value.showSaslJaasConfig = type === 'KAFKA';
  formState.value.showSchemaRegistryUrl = false;
  
  formState.value.showCatalogType = type === 'PAIMON';
  formState.value.showWarehouse = type === 'PAIMON';
  formState.value.showCatalogUri = false;
  
  if (!formState.value.showMode) {
    formState.value.showUserName = !['K8S', 'ALIYUN_SERVERLESS_SPARK', 'MAXCOMPUTE', 'PAIMON'].includes(type);
    formState.value.showPassword = !['K8S', 'ALIYUN_SERVERLESS_SPARK', 'MAXCOMPUTE', 'PAIMON'].includes(type);
  } else {
    updateModeRelatedFields(currentMode.value, type);
  }
}

function updateModeRelatedFields(mode: string, type: string) {
  formState.value.showUserName = false;
  formState.value.showPassword = false;
  formState.value.showDbUser = false;
  formState.value.showMSIClientId = false;
  formState.value.showOAuthEndpoint = false;
  formState.value.showEndpoint = type === 'ALIYUN_SERVERLESS_SPARK';
  
  if (mode === 'SqlPassword' || mode === 'password') {
    formState.value.showUserName = true;
    formState.value.showPassword = true;
  } else if (mode === 'ActiveDirectoryPassword') {
    formState.value.showUserName = true;
    formState.value.showPassword = true;
  } else if (mode === 'ActiveDirectoryMSI') {
    formState.value.showMSIClientId = true;
  } else if (mode === 'ActiveDirectoryServicePrincipal') {
    formState.value.showUserName = true;
    formState.value.showPassword = true;
  } else if (mode === 'accessToken') {
    formState.value.showUserName = true;
    formState.value.showPassword = true;
    formState.value.showOAuthEndpoint = true;
  } else if (mode === 'IAM-accessKey') {
    formState.value.showUserName = true;
    formState.value.showPassword = true;
    formState.value.showDbUser = type !== 'SAGEMAKER';
  }
}

watch(currentMode, (newMode) => {
  if (formState.value.showMode) {
    updateModeRelatedFields(newMode, selectType.value);
  }
});

function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'searchVal',
      label: $t('datasource.new.datasourceName'),
    },
  ];
}

function useColumns(): VxeGridPropTypes.Columns {
  return [
    { field: 'name', title: $t('datasource.new.datasourceName'), minWidth: 150 },
    { field: 'userName', title: $t('datasource.new.userName'), width: 120 },
    { 
      field: 'type', 
      title: $t('datasource.new.datasourceType'), 
      width: 150,
      slots: {
        default: ({ row }) => {
          return h(Tag, { color: 'blue' }, () => getDatasourceTypeLabel(row.type));
        },
      },
    },
    { 
      field: 'parameter', 
      title: $t('datasource.new.parameter'), 
      width: 120,
      slots: {
        default: ({ row }) => {
          let connectionParams = row.connectionParams;
          if (typeof connectionParams === 'string') {
            try {
              connectionParams = JSON.parse(connectionParams);
            } catch {
              connectionParams = {};
            }
          }
          const formatValue = (val: any): string => {
            if (val === null || val === undefined) return '-';
            if (typeof val === 'object') return JSON.stringify(val, null, 2);
            return String(val);
          };
          
          let displayParams = connectionParams;
          if (row.type === 'MAXCOMPUTE') {
            const mcParams: Record<string, any> = {};
            const mcKeys = ['project', 'accessId', 'accessKey', 'endpoint', 'tunnelEndpoint'];
            mcKeys.forEach(key => {
              if (connectionParams[key] !== undefined) {
                mcParams[key] = connectionParams[key];
              }
            });
            displayParams = mcParams;
          } else if (row.type === 'PAIMON') {
            const mcParams: Record<string, any> = {};
            const mcKeys = ['catalogType', 'warehouse'];
            mcKeys.forEach(key => {
              if (connectionParams[key] !== undefined) {
                mcParams[key] = connectionParams[key];
              }
            });
            displayParams = mcParams;
          }
          
          const items = displayParams 
            ? Object.entries(displayParams).map(([key, value]) => 
                h('div', { class: 'flex gap-2 py-1' }, [
                  h('span', { class: 'font-medium text-gray-600' }, `${key}:`),
                  h('span', { class: 'text-gray-800 whitespace-pre-wrap' }, formatValue(value)),
                ])
              )
            : [h('div', { class: 'text-gray-400' }, '-')];
          const content = h('div', { class: 'max-h-60 overflow-auto' }, items);
          return h(Popover, { content: content, trigger: 'click' }, () => 
            h('a', { class: 'text-primary cursor-pointer' }, $t('datasource.new.clickToView'))
          );
        },
      },
    },
    { field: 'note', title: $t('datasource.new.description'), minWidth: 150, showOverflow: 'tooltip' },
    { field: 'createTime', title: $t('datasource.new.createTime'), width: 180 },
    { field: 'updateTime', title: $t('datasource.new.updateTime'), width: 180 },
    {
      align: 'center',
      field: 'operation',
      fixed: 'right',
      slots: { default: 'action' },
      title: $t('datasource.new.operation'),
      width: 200,
    },
  ];
}

function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'id',
      label: 'ID',
      dependencies: {
        show: () => false,
        triggerFields: ['id'],
      },
    },
    {
      component: 'Input',
      fieldName: 'typeCode',
      label: 'Type Code',
      dependencies: {
        show: () => false,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'type',
      label: $t('datasource.new.datasourceType'),
      componentProps: {
        disabled: false,
      },
      renderComponentContent: () => ({
        suffix: () => h('a', { 
          class: 'text-primary cursor-pointer',
          onClick: () => { showTypeModal.value = true; }
        }, $t('datasource.new.selectDatasourceType')),
      }),
    },
    {
      component: 'Input',
      fieldName: 'name',
      label: $t('datasource.new.datasourceName'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.datasourceNamePlaceholder'),
        maxlength: 60,
      },
    },
    {
      component: 'Textarea',
      fieldName: 'note',
      label: $t('datasource.new.description'),
      componentProps: {
        placeholder: $t('datasource.new.descriptionPlaceholder'),
        rows: 2,
      },
    },
    {
      component: 'Input',
      fieldName: 'host',
      label: $t('datasource.new.host'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.hostPlaceholder'),
        maxlength: 255,
      },
      dependencies: {
        show: () => formState.value.showHost,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'InputNumber',
      fieldName: 'port',
      label: $t('datasource.new.port'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.portPlaceholder'),
        min: 0,
        max: 65535,
        style: { width: '100%' },
      },
      dependencies: {
        show: () => formState.value.showPort,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'restEndpoint',
      label: $t('datasource.new.restEndpoint'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.restEndpointPlaceholder'),
        maxlength: 255,
      },
      dependencies: {
        show: () => formState.value.showRestEndpoint,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'accessKeyId',
      label: $t('datasource.new.accessKeyId'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.accessKeyIdPlaceholder'),
        maxlength: 255,
      },
      dependencies: {
        show: () => formState.value.showAccessKeyId,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'InputPassword',
      fieldName: 'accessKeySecret',
      label: $t('datasource.new.accessKeySecret'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.accessKeySecretPlaceholder'),
        maxlength: 255,
      },
      dependencies: {
        show: () => formState.value.showAccessKeySecret,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'regionId',
      label: $t('datasource.new.regionId'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.regionIdPlaceholder'),
        maxlength: 255,
      },
      dependencies: {
        show: () => formState.value.showRegionId,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'awsRegion',
      label: $t('datasource.new.awsRegion'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.awsRegionPlaceholder'),
        maxlength: 255,
      },
      dependencies: {
        show: () => formState.value.showAwsRegion,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'RadioGroup',
      fieldName: 'connectType',
      label: $t('datasource.new.connectType'),
      rules: 'required',
      componentProps: {
        options: [
          { label: 'SERVICE_NAME', value: 'ORACLE_SERVICE_NAME' },
          { label: 'SID', value: 'ORACLE_SID' },
        ],
      },
      dependencies: {
        show: () => formState.value.showConnectType,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'principal',
      label: 'Principal',
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.principalPlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showPrincipal,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'javaSecurityKrb5Conf',
      label: 'krb5.conf',
      componentProps: {
        placeholder: $t('datasource.new.krb5ConfPlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showPrincipal,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'loginUserKeytabUsername',
      label: 'keytab.username',
      componentProps: {
        placeholder: $t('datasource.new.keytabUsernamePlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showKeytab,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'loginUserKeytabPath',
      label: 'keytab.path',
      componentProps: {
        placeholder: $t('datasource.new.keytabPathPlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showKeytab,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Select',
      fieldName: 'mode',
      label: $t('datasource.new.validationMode'),
      rules: 'required',
      componentProps: {
        options: modeOptions,
        placeholder: $t('datasource.new.modePlaceholder'),
        onChange: (val: string) => { currentMode.value = val; },
      },
      dependencies: {
        show: () => formState.value.showMode && selectType.value === 'AZURESQL',
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Select',
      fieldName: 'mode',
      label: $t('datasource.new.validationMode'),
      rules: 'required',
      componentProps: {
        options: redshiftModeOptions,
        placeholder: $t('datasource.new.modePlaceholder'),
        onChange: (val: string) => { currentMode.value = val; },
      },
      dependencies: {
        show: () => formState.value.showMode && selectType.value === 'REDSHIFT',
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Select',
      fieldName: 'mode',
      label: $t('datasource.new.validationMode'),
      rules: 'required',
      componentProps: {
        options: sagemakerModeOption,
        placeholder: $t('datasource.new.modePlaceholder'),
        onChange: (val: string) => { currentMode.value = val; },
      },
      dependencies: {
        show: () => formState.value.showMode && selectType.value === 'SAGEMAKER',
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'userName',
      label: $t('datasource.new.userName'),
      componentProps: {
        placeholder: $t('datasource.new.userNamePlaceholder'),
        maxlength: 60,
      },
      dependencies: {
        show: () => formState.value.showUserName,
        rules: () => selectType.value === 'KAFKA' ? undefined : 'required',
        triggerFields: ['typeCode', 'mode'],
      },
    },
    {
      component: 'InputPassword',
      fieldName: 'password',
      label: $t('datasource.new.password'),
      componentProps: {
        placeholder: $t('datasource.new.passwordPlaceholder'),
        maxlength: 60,
      },
      dependencies: {
        show: () => formState.value.showPassword,
        rules: () => selectType.value === 'KAFKA' ? undefined : 'required',
        triggerFields: ['typeCode', 'mode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'MSIClientId',
      label: $t('datasource.new.MSIClientId'),
      componentProps: {
        placeholder: $t('datasource.new.MSIClientIdPlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showMSIClientId,
        triggerFields: ['typeCode', 'mode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'dbUser',
      label: $t('datasource.new.dbUser'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.dbUserPlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showDbUser,
        triggerFields: ['typeCode', 'mode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'database',
      label: selectType.value === 'MAXCOMPUTE' ? $t('datasource.new.project') : $t('datasource.new.database'),
      rules: 'required',
      componentProps: {
        placeholder: selectType.value === 'MAXCOMPUTE' ? $t('datasource.new.projectPlaceholder') : $t('datasource.new.databasePlaceholder'),
        maxlength: 100,
      },
      dependencies: {
        show: () => formState.value.showDatabase,
        required: () => formState.value.requiredDatabase,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'datawarehouse',
      label: $t('datasource.new.datawarehouse'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.datawarehousePlaceholder'),
        maxlength: 60,
      },
      dependencies: {
        show: () => formState.value.showDatawarehouse,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'compatibleMode',
      label: $t('datasource.new.compatibleMode'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.compatibleModePlaceholder'),
        maxlength: 60,
      },
      dependencies: {
        show: () => formState.value.showCompatibleMode,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'accessId',
      label: $t('datasource.new.accessId'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.accessIdPlaceholder'),
        maxlength: 60,
      },
      dependencies: {
        show: () => formState.value.showAccess,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'InputPassword',
      fieldName: 'accessKey',
      label: $t('datasource.new.accessKey'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.accessKeyPlaceholder'),
        maxlength: 60,
      },
      dependencies: {
        show: () => formState.value.showAccess,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'endpoint',
      label: $t('datasource.new.endpoint'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.endpointPlaceholder'),
        maxlength: 255,
      },
      dependencies: {
        show: () => formState.value.showEndpoint || formState.value.showOAuthEndpoint,
        triggerFields: ['typeCode', 'mode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'tunnelEndpoint',
      label: $t('datasource.new.tunnelEndpoint'),
      componentProps: {
        placeholder: $t('datasource.new.tunnelEndpointPlaceholder'),
        maxlength: 255,
      },
      dependencies: {
        show: () => formState.value.showTunnelEndpoint,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Textarea',
      fieldName: 'privateKey',
      label: $t('datasource.new.privateKey'),
      componentProps: {
        placeholder: $t('datasource.new.privateKeyPlaceholder'),
        rows: 4,
      },
      dependencies: {
        show: () => formState.value.showPrivateKey,
        required: () => formState.value.requiredPrivateKey,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'namespace',
      label: $t('datasource.new.namespace'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.namespacePlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showNamespace,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Textarea',
      fieldName: 'kubeConfig',
      label: $t('datasource.new.kubeConfig'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.kubeConfigPlaceholder'),
        rows: 14,
      },
      dependencies: {
        show: () => formState.value.showKubeConfig,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'saslMechanism',
      label: $t('datasource.new.saslMechanism'),
      componentProps: {
        placeholder: $t('datasource.new.saslMechanismPlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showSaslMechanism,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'securityProtocol',
      label: $t('datasource.new.securityProtocol'),
      componentProps: {
        placeholder: $t('datasource.new.securityProtocolPlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showSecurityProtocol,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Textarea',
      fieldName: 'saslJaasConfig',
      label: $t('datasource.new.saslJaasConfig'),
      componentProps: {
        placeholder: $t('datasource.new.saslJaasConfigPlaceholder'),
        rows: 4,
      },
      dependencies: {
        show: () => formState.value.showSaslJaasConfig,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'schemaRegistryUrl',
      label: $t('datasource.new.schemaRegistryUrl'),
      componentProps: {
        placeholder: $t('datasource.new.schemaRegistryUrlPlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showSchemaRegistryUrl,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'catalogType',
      label: $t('datasource.new.catalogType'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.catalogTypePlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showCatalogType,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'warehouse',
      label: $t('datasource.new.warehouse'),
      rules: 'required',
      componentProps: {
        placeholder: $t('datasource.new.warehousePlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showWarehouse,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Input',
      fieldName: 'catalogUri',
      label: $t('datasource.new.catalogUri'),
      componentProps: {
        placeholder: $t('datasource.new.catalogUriPlaceholder'),
      },
      dependencies: {
        show: () => formState.value.showCatalogUri,
        triggerFields: ['typeCode'],
      },
    },
    {
      component: 'Textarea',
      fieldName: 'other',
      label: $t('datasource.new.jdbcParams'),
      componentProps: {
        placeholder: $t('datasource.new.jdbcParamsPlaceholder'),
        rows: 2,
      },
      dependencies: {
        show: () => formState.value.showJdbcParams,
        triggerFields: ['typeCode'],
      },
    },
  ];
}

const [Form, formApi] = useVbenForm({
  schema: useFormSchema(),
  showDefaultActions: false,
});

watch(selectType, (newType) => {
  if (newType) {
    updateFormState(newType);
    formApi.updateSchema([
      { fieldName: 'host', dependencies: { show: () => formState.value.showHost, triggerFields: ['typeCode'] } },
      { fieldName: 'port', dependencies: { show: () => formState.value.showPort, triggerFields: ['typeCode'] } },
      { fieldName: 'restEndpoint', dependencies: { show: () => formState.value.showRestEndpoint, triggerFields: ['typeCode'] } },
      { fieldName: 'accessKeyId', dependencies: { show: () => formState.value.showAccessKeyId, triggerFields: ['typeCode'] } },
      { fieldName: 'accessKeySecret', dependencies: { show: () => formState.value.showAccessKeySecret, triggerFields: ['typeCode'] } },
      { fieldName: 'regionId', dependencies: { show: () => formState.value.showRegionId, triggerFields: ['typeCode'] } },
      { fieldName: 'endpoint', dependencies: { show: () => formState.value.showEndpoint || formState.value.showOAuthEndpoint, triggerFields: ['typeCode', 'mode'] } },
      { fieldName: 'awsRegion', dependencies: { show: () => formState.value.showAwsRegion, triggerFields: ['typeCode'] } },
      { fieldName: 'connectType', dependencies: { show: () => formState.value.showConnectType, triggerFields: ['typeCode'] } },
      { fieldName: 'principal', dependencies: { show: () => formState.value.showPrincipal, triggerFields: ['typeCode'] } },
      { fieldName: 'javaSecurityKrb5Conf', dependencies: { show: () => formState.value.showPrincipal, triggerFields: ['typeCode'] } },
      { fieldName: 'loginUserKeytabUsername', dependencies: { show: () => formState.value.showKeytab, triggerFields: ['typeCode'] } },
      { fieldName: 'loginUserKeytabPath', dependencies: { show: () => formState.value.showKeytab, triggerFields: ['typeCode'] } },
      { fieldName: 'userName', dependencies: { show: () => formState.value.showUserName, triggerFields: ['typeCode', 'mode'] } },
      { fieldName: 'password', dependencies: { show: () => formState.value.showPassword, triggerFields: ['typeCode', 'mode'] } },
      { fieldName: 'MSIClientId', dependencies: { show: () => formState.value.showMSIClientId, triggerFields: ['typeCode', 'mode'] } },
      { fieldName: 'dbUser', dependencies: { show: () => formState.value.showDbUser, triggerFields: ['typeCode', 'mode'] } },
      { fieldName: 'database', dependencies: { show: () => formState.value.showDatabase, required: () => formState.value.requiredDatabase, triggerFields: ['typeCode'] }, label: newType === 'MAXCOMPUTE' ? $t('datasource.new.project') : $t('datasource.new.database') },
      { fieldName: 'datawarehouse', dependencies: { show: () => formState.value.showDatawarehouse, triggerFields: ['typeCode'] } },
      { fieldName: 'compatibleMode', dependencies: { show: () => formState.value.showCompatibleMode, triggerFields: ['typeCode'] } },
      { fieldName: 'accessId', dependencies: { show: () => formState.value.showAccess, triggerFields: ['typeCode'] } },
      { fieldName: 'accessKey', dependencies: { show: () => formState.value.showAccess, triggerFields: ['typeCode'] } },
      { fieldName: 'tunnelEndpoint', dependencies: { show: () => formState.value.showTunnelEndpoint, triggerFields: ['typeCode'] } },
      { fieldName: 'privateKey', dependencies: { show: () => formState.value.showPrivateKey, required: () => formState.value.requiredPrivateKey, triggerFields: ['typeCode'] } },
      { fieldName: 'namespace', dependencies: { show: () => formState.value.showNamespace, triggerFields: ['typeCode'] } },
      { fieldName: 'kubeConfig', dependencies: { show: () => formState.value.showKubeConfig, triggerFields: ['typeCode'] } },
      { fieldName: 'saslMechanism', dependencies: { show: () => formState.value.showSaslMechanism, triggerFields: ['typeCode'] } },
      { fieldName: 'securityProtocol', dependencies: { show: () => formState.value.showSecurityProtocol, triggerFields: ['typeCode'] } },
      { fieldName: 'saslJaasConfig', dependencies: { show: () => formState.value.showSaslJaasConfig, triggerFields: ['typeCode'] } },
      { fieldName: 'schemaRegistryUrl', dependencies: { show: () => formState.value.showSchemaRegistryUrl, triggerFields: ['typeCode'] } },
      { fieldName: 'catalogType', dependencies: { show: () => formState.value.showCatalogType, triggerFields: ['typeCode'] } },
      { fieldName: 'warehouse', dependencies: { show: () => formState.value.showWarehouse, triggerFields: ['typeCode'] } },
      { fieldName: 'catalogUri', dependencies: { show: () => formState.value.showCatalogUri, triggerFields: ['typeCode'] } },
      { fieldName: 'other', dependencies: { show: () => formState.value.showJdbcParams, triggerFields: ['typeCode'] } },
    ]);
  }
});

const getTitle = computed(() => {
  return editId.value ? $t('datasource.new.editDatasource') : $t('datasource.new.createDatasource');
});

async function buildParams(values: Record<string, any>): Promise<DataSourceCreateParams> {
  let other = values.other;
  if (other && typeof other === 'string') {
    try {
      other = JSON.parse(other);
    } catch {
      other = {};
    }
  }
  
  const params: DataSourceCreateParams = {
    name: values.name,
    type: selectType.value,
    host: selectType.value === 'MAXCOMPUTE' ? undefined : values.host,
    port: selectType.value === 'MAXCOMPUTE' ? undefined : values.port,
    database: selectType.value === 'MAXCOMPUTE' ? undefined : values.database,
    userName: values.userName,
    password: values.password,
    note: values.note,
    principal: values.principal,
    javaSecurityKrb5Conf: values.javaSecurityKrb5Conf,
    loginUserKeytabUsername: values.loginUserKeytabUsername,
    loginUserKeytabPath: values.loginUserKeytabPath,
    mode: values.mode,
    connectType: values.connectType,
    other,
    endpoint: values.endpoint,
    restEndpoint: values.restEndpoint,
    accessKeyId: values.accessKeyId,
    accessKeySecret: values.accessKeySecret,
    regionId: values.regionId,
    awsRegion: values.awsRegion,
    MSIClientId: values.MSIClientId,
    dbUser: values.dbUser,
    datawarehouse: values.datawarehouse,
    accessId: values.accessId,
    accessKey: values.accessKey,
    privateKey: values.privateKey,
    namespace: values.namespace,
    kubeConfig: values.kubeConfig,
    compatibleMode: values.compatibleMode,
    tunnelEndpoint: values.tunnelEndpoint,
    saslMechanism: values.saslMechanism,
    securityProtocol: values.securityProtocol,
    saslJaasConfig: values.saslJaasConfig,
    schemaRegistryUrl: values.schemaRegistryUrl,
    catalogType: values.catalogType,
    warehouse: values.warehouse,
    catalogUri: values.catalogUri,
  };
  
  if (selectType.value === 'MAXCOMPUTE') {
    params.project = values.database;
  }
  
  return params;
}

async function onTestConnection() {
  const { valid } = await formApi.validate();
  if (!valid) return;
  
  const values = await formApi.getValues();
  
  if (selectType.value === 'KAFKA') {
    const hasUserNamePassword = values.userName && values.password;
    const hasSaslJaasConfig = values.saslJaasConfig;
    if (!hasUserNamePassword && !hasSaslJaasConfig) {
      message.warning('Kafka数据源需要填写用户名密码或SASL JAAS配置（二选一）');
      return;
    }
  }
  
  testing.value = true;
  try {
    const params = await buildParams(values);
    const result = await testConnectionApi(params);
    if (result) {
      message.success($t('datasource.new.testSuccess'));
    } else {
      message.error($t('datasource.new.testFailed'));
    }
  } catch (error: any) {
    message.error(error?.message || $t('datasource.new.testFailed'));
  } finally {
    testing.value = false;
  }
}

const [FormModal, formModalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    const values = await formApi.getValues();
    
    if (selectType.value === 'KAFKA') {
      const hasUserNamePassword = values.userName && values.password;
      const hasSaslJaasConfig = values.saslJaasConfig;
      if (!hasUserNamePassword && !hasSaslJaasConfig) {
        message.warning('Kafka数据源需要填写用户名密码或SASL JAAS配置（二选一）');
        return;
      }
    }
    
    formModalApi.lock();
    try {
      const params = await buildParams(values);
      
      if (editId.value) {
        await updateDataSourceApi(editId.value, params);
        message.success($t('datasource.new.updateSuccess'));
      } else {
        await createDataSourceApi(params);
        message.success($t('datasource.new.createSuccess'));
      }
      onRefresh();
      formModalApi.close();
    } catch (error: any) {
      message.error(error?.message || 'Operation failed');
    } finally {
      formModalApi.unlock();
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = formModalApi.getData<DataSourceInfo>();
      formApi.resetForm();
      if (data?.id) {
        editId.value = data.id;
        selectType.value = data.type;
        currentMode.value = data.mode || '';
        updateFormState(data.type);
        const formValues = { ...data, typeCode: data.type, type: getDatasourceTypeLabel(data.type) };
        if (formValues.other && typeof formValues.other === 'object') {
          formValues.other = JSON.stringify(formValues.other, null, 2);
        }
        if (data.type === 'MAXCOMPUTE' && data.project) {
          formValues.database = data.project;
        }
        formApi.setValues(formValues);
      } else {
        editId.value = undefined;
        const typeCode = data?.type || selectType.value;
        selectType.value = typeCode;
        currentMode.value = '';
        updateFormState(typeCode);
        formApi.setValues({
          typeCode: typeCode,
          type: getDatasourceTypeLabel(typeCode),
          port: getDatasourceTypeDefaultPort(typeCode),
        });
      }
    }
  },
});

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(),
    keepSource: true,
    pagerConfig: {
      enabled: true,
      pageSize: 10,
      pageSizes: [10, 30, 50],
    },
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          const result = await getDataSourceListApi(
            page.currentPage,
            page.pageSize,
            formValues?.searchVal || '',
          );
          return {
            items: result.totalList,
            total: result.total,
          };
        },
      },
    },
    rowConfig: { keyField: 'id' },
    toolbarConfig: {
      custom: false,
      export: false,
      refresh: true,
      search: false,
      zoom: true,
    },
  } as VxeTableGridOptions<DataSourceInfo>,
});

function confirm(content: string, title: string) {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      content,
      onCancel() {
        reject(new Error($t('datasource.new.cancel')));
      },
      onOk() {
        resolve(true);
      },
      title,
    });
  });
}

async function onEdit(row: DataSourceInfo) {
  try {
    const detail = await getDataSourceDetailApi(row.id);
    selectType.value = detail.type;
    formModalApi.setData(detail).open();
  } catch (error: any) {
    message.error(error?.message || 'Failed to load datasource detail');
  }
}

async function onShowMeta(row: DataSourceInfo) {
  currentMetaDataSource.value = row;
  metaPageNo.value = 1;
  metaList.value = [];
  showMetaModal.value = true;
  await loadMetaData();
}

async function loadMetaData() {
  if (!currentMetaDataSource.value) return;
  metaLoading.value = true;
  try {
    const result = await getMetasApi(currentMetaDataSource.value.id, metaPageNo.value, metaPageSize.value);
    metaList.value = result.totalList || [];
    metaTotal.value = result.total || 0;
  } catch (error: any) {
    message.error(error?.message || 'Failed to load metadata');
  } finally {
    metaLoading.value = false;
  }
}

function onMetaPageChange(page: number, pageSize: number) {
  metaPageNo.value = page;
  metaPageSize.value = pageSize;
  loadMetaData();
}

async function handleSyncMetas() {
  if (!currentMetaDataSource.value) return;
  syncLoading.value = true;
  try {
    metaList.value = [];
    metaTotal.value = 0;
    await syncMetas(currentMetaDataSource.value.id);
    message.success($t('datasource.new.syncSuccess'));
    metaPageNo.value = 1;
    await loadMetaData();
  } catch (error: any) {
    message.error(error?.message || 'Failed to sync metadata');
  } finally {
    syncLoading.value = false;
  }
}

async function onDelete(row: DataSourceInfo) {
  try {
    await confirm($t('datasource.new.deleteConfirm', { name: row.name }), $t('datasource.new.deleteTitle'));
    await deleteDataSourceApi(row.id);
    message.success($t('datasource.new.deleteSuccess'));
    onRefresh();
  } catch {
  }
}

function onRefresh() {
  gridApi.query();
}

function onCreate() {
  editId.value = undefined;
  showTypeModal.value = true;
}

function onSelectType(type: string) {
  selectType.value = type;
  showTypeModal.value = false;
  currentMode.value = '';
  updateFormState(type);
  if (editId.value) {
    formApi.setValues({
      typeCode: type,
      type: getDatasourceTypeLabel(type),
      port: getDatasourceTypeDefaultPort(type),
    });
  } else {
    const currentValues = formApi.getValues();
    formModalApi.setData({ type }).open();
    nextTick(() => {
      formApi.setValues({
        ...currentValues,
        typeCode: type,
        type: getDatasourceTypeLabel(type),
        port: getDatasourceTypeDefaultPort(type),
      });
    });
  }
}

function getTypesByCategory(category: string): DataSourceType[] {
  return datasourceTypes.filter((item) => item.category === category);
}
</script>
<template>
  <Page
    auto-content-height
    :title="$t('datasource.list.pageTitle')"
    :description="$t('datasource.list.pageDescription')"
  >
    <FormModal :title="getTitle">
      <Form class="mx-4" />
      <template #prepend-footer>
        <Button type="primary" :loading="testing" @click="onTestConnection">
          {{ $t('datasource.new.testConnection') }}
        </Button>
      </template>
    </FormModal>
    
    <Modal
      v-model:open="showTypeModal"
      :title="$t('datasource.new.selectDatasourceType')"
      :footer="null"
      width="900px"
    >
      <Tabs v-model:activeKey="activeCategory">
        <TabPane 
          v-for="(category, key) in datasourceCategories" 
          :key="key" 
          :tab="category.label"
        >
          <div class="grid grid-cols-4 gap-4 p-4">
            <div
              v-for="item in getTypesByCategory(key as string)"
              :key="item.value"
              class="flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              @click="onSelectType(item.value)"
            >
              <span class="text-base font-medium">{{ item.label }}</span>
              <span v-if="item.defaultPort > 0" class="text-xs text-gray-500 mt-1">
                {{ $t('datasource.new.defaultPort') }}: {{ item.defaultPort }}
              </span>
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Modal>
    
    <Modal
      v-model:open="showMetaModal"
      :title="$t('datasource.new.metaTitle', { name: currentMetaDataSource?.name || '' })"
      width="700px"
    >
      <Spin :spinning="metaLoading">
        <div style="height: 400px; overflow: auto;">
          <Table
            :dataSource="metaList"
            :columns="metaColumns"
            :pagination="false"
            :row-key="(record: DataSourceMeta) => record.tableName"
            size="small"
          />
          <div class="mt-4 flex justify-end" style="flex-wrap: nowrap;">
            <Pagination
              v-model:current="metaPageNo"
              v-model:page-size="metaPageSize"
              :total="metaTotal"
              :show-size-changer="true"
              :show-quick-jumper="true"
              :show-less-items="true"
              :show-total="(total: number) => $t('datasource.new.metaTotal', { total })"
              @change="onMetaPageChange"
            />
          </div>
        </div>
      </Spin>
      <template #footer>
        <Button @click="showMetaModal = false">{{ $t('datasource.new.cancel') }}</Button>
        <Button type="primary" :loading="syncLoading" @click="handleSyncMetas">{{ $t('datasource.new.sync') }}</Button>
      </template>
    </Modal>
    
    <Card class="task-card">
      <Grid :table-title="$t('datasource.list.title')" :table-title-help="$t('datasource.list.tableTitleHelp')">
        <template #toolbar-tools>
          <Button type="primary" @click="onCreate">
            <Plus class="mr-1 size-4" />
            {{ $t('datasource.new.createDatasource') }}
          </Button>
        </template>
        <template #action="{ row }">
          <Space size="small" wrap class="action-buttons">
            <Tooltip :title="$t('datasource.new.edit')">
              <Button size="large" type="link" @click="onEdit(row)">
                <template #icon><EditOutlined /></template>
              </Button>
            </Tooltip>
            <Tooltip :title="$t('datasource.new.meta')">
              <Button size="large" type="link" @click="onShowMeta(row)">
                <template #icon><TableOutlined /></template>
              </Button>
            </Tooltip>
            <Popconfirm
              :title="$t('datasource.new.deleteConfirm', { name: row.name })"
              :ok-text="$t('datasource.new.confirm')"
              :cancel-text="$t('datasource.new.cancel')"
              @confirm="onDelete(row)"
            >
              <Tooltip :title="$t('datasource.new.delete')">
                <Button size="large" type="link" danger>
                  <template #icon><DeleteOutlined /></template>
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        </template>
      </Grid>
    </Card>
  </Page>
</template>

<style scoped>
.task-card {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

:deep(.ant-card-body) {
  padding: 8px !important;
}

:deep(.vxe-grid) {
  height: 100% !important;
}

:deep(.vxe-table) {
  font-size: 14px;
}

:deep(.vxe-table--body-wrapper) {
  overflow-y: auto !important;
  border-radius: 0 0 8px 8px;
}

:deep(.vxe-table--render-default .vxe-body--row:nth-child(even)) {
  background-color: #fafafa;
}

.vxe-table:not([data-calc-col]) .vxe-cell--wrapper {
  min-width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-buttons {
  align-items: center;
  justify-content: center;
  display: flex !important;
  flex-wrap: nowrap !important;
  gap: 0px !important;
  margin-bottom: 0 !important;
}

.action-buttons :deep(.ant-btn) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 6px;
  height: auto;
  line-height: 1;
  min-width: auto;
  min-height: 24px;
}

.action-buttons :deep(.ant-btn .anticon) {
  font-size: 16px;
  line-height: 1;
}
</style>
