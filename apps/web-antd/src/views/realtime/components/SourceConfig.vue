<template>
  <div>
    <Card class="mb-4" :bordered="false">
      <template #title>
        <span class="card-title">
          <span class="title-badge">01</span>
          源端配置
        </span>
      </template>
    </Card>

    <div class="config-content-wrapper">
      <div class="config-content">
        <!-- 配置内容区域 -->
        <Form ref="formRef" :model="formData" layout="vertical">
          <Row :gutter="24">
            <Col :span="8">
              <Form.Item
                label="kafka"
                class="custom-label"
                name="kafka"
                :rules="[{ required: true, message: '请选择Kafka集群' }]"
              >
                <Select
                  v-model:value="formData.kafka"
                  placeholder="请选择Kafka集群"
                  @change="onKafkaChange"
                  style="width: 100%"
                >
                  <Option
                    v-for="item in kafkaOptions"
                    :key="item.value"
                    :value="item.value"
                    >{{ item.label }}</Option
                  >
                </Select>
              </Form.Item>
            </Col>
            <Col :span="8">
              <Form.Item
                label="topic"
                class="custom-label"
                name="topic"
                :rules="[{ required: true, message: '请选择Topic' }]"
              >
                <Select
                  v-model:value="formData.topic"
                  placeholder="请选择Topic"
                  :loading="loadingTopics"
                  :disabled="!formData.kafka"
                  style="width: 100%"
                >
                  <Option
                    v-for="item in topicOptions"
                    :key="item.value"
                    :value="item.value"
                    >{{ item.label }}</Option
                  >
                </Select>
              </Form.Item>
            </Col>
            <Col :span="8">
              <Form.Item
                label="表名"
                class="custom-label"
                name="schemaDefinition"
                :rules="[{ required: true, message: '请选择或输入表名' }]"
              >
                <Select
                  v-model:value="formData.schemaDefinition"
                  placeholder="请选择或输入表名"
                  :loading="loadingSchemas"
                  :disabled="!formData.topic"
                  style="width: 100%"
                  show-search
                  :filter-option="filterSchemaOption"
                >
                  <Option
                    v-for="item in schemaOptions"
                    :key="item.value"
                    :value="item.value"
                    >{{ item.label }}</Option
                  >
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row :gutter="24">
            <Col :span="12">
              <Form.Item
                label="消息key是否标识表名"
                class="custom-label"
                name="isKeyTableName"
                :rules="[
                  { required: true, message: '请选择消息key是否标识表名' },
                ]"
              >
                <Radio.Group
                  v-model:value="formData.isKeyTableName"
                  class="radio-group-spacing"
                >
                  <Radio :value="true">是</Radio>
                  <Radio :value="false">否</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col :span="12" hidden="true">
              <Form.Item label="表名过滤" class="custom-label">
                <Input
                  v-model:value="formData.tableNameFilter"
                  :disabled="!formData.isKeyTableName"
                  placeholder=""
                />
              </Form.Item>
            </Col>
          </Row>
          <Row :gutter="24">
            <Col :span="24">
              <Form.Item
                label="数据格式"
                class="custom-label"
                name="dataFormat"
                :rules="[{ required: true, message: '请选择数据格式' }]"
              >
                <Radio.Group
                  v-model:value="formData.dataFormat"
                  class="radio-group-spacing"
                >
                  <Radio value="Protobuf">Protobuf</Radio>
                  <Radio value="JSON" disabled>JSON</Radio>
                  <Radio value="Avro" disabled>Avro</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
          <Row :gutter="24">
            <Col :span="12">
              <Form.Item
                label="消费组ID"
                class="custom-label"
                name="groupId"
                :rules="[{ required: true, message: '请输入消费组ID' }]"
              >
                <Input v-model:value="formData.groupId" placeholder="请输入" />
              </Form.Item>
            </Col>
            <Col :span="6">
              <Form.Item
                label="启动位点"
                class="custom-label"
                name="consumePosition"
                :rules="[{ required: true, message: '请选择启动位点' }]"
              >
                <Select
                  v-model:value="formData.consumePosition"
                  style="width: 100%"
                >
                  <Option
                    v-for="item in consumePositionOptions"
                    :key="item.value"
                    :value="item.value"
                    >{{ item.label }}</Option
                  >
                </Select>
              </Form.Item>
            </Col>

            <Col :span="6" v-if="formData.consumePosition === 'timestamp'">
              <Form.Item
                label="时间戳"
                class="custom-label"
                name="timestamp"
                :rules="[{ required: true, message: '请选择时间戳' }]"
              >
                <DatePicker
                  v-model:value="selectedDate"
                  show-time
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder="请选择时间"
                  style="width: 100%"
                  @change="onDateChange"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row :gutter="24" hidden="true">
            <Col :span="24" style="margin-top: 20px">
              <Form.Item>
                <Button @click="testDataStructure" type="primary"
                  >测试数据结构</Button
                >
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from "vue";
import { useRealtimeWizardStore } from "#/store/realtime-wizard";
import {
  Card,
  Form,
  Select,
  Input,
  Radio,
  Button,
  Row,
  Col,
  message,
  DatePicker,
} from "ant-design-vue";
import type { FormInstance } from "ant-design-vue"; // 引入 FormInstance 类型
import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// 扩展 dayjs 插件以支持时区
dayjs.extend(utc);
dayjs.extend(timezone);

const { Option } = Select;

import { onActivated } from "vue";

// 使用 Store
const wizardStore = useRealtimeWizardStore();

// 定义类型接口
interface SelectOption {
  label: string;
  value: string;
}

interface SourceConfigFormData {
  kafka: string;
  topic: string;
  groupId: string;
  consumePosition: string;
  timestamp: string;
  dataFormat: "Protobuf" | "JSON" | "Avro";
  isKeyTableName: boolean;
  tableNameFilter: string;
  schemaDefinition: string;
}

// 定义选项数据
const kafkaOptions = ref<SelectOption[]>([]); // 修改为动态加载
const loadingKafka = ref(false); // 添加 Kafka 加载状态

// Topic 和 Schema 选项数据，将在选择 Kafka 和 Topic 后动态加载
const topicOptions = ref<SelectOption[]>([]);
const schemaOptions = ref<SelectOption[]>([]);

// 加载状态
const loadingTopics = ref(false);
const loadingSchemas = ref(false);

// 定义启动位点选项数据
const consumePositionOptions = ref<SelectOption[]>([
  { label: "指定时间戳", value: "timestamp" },
  { label: "最早位点", value: "earliest" },
  { label: "最新位点", value: "latest" },
]);

const formData = reactive<SourceConfigFormData>({
  kafka: "",
  topic: "",
  groupId: "",
  consumePosition: "",
  timestamp: "",
  dataFormat: "Protobuf",
  isKeyTableName: false,
  tableNameFilter: "",
  schemaDefinition: "",
});

// 新增：用于绑定 DatePicker 的显示值
const selectedDate = ref<Dayjs | null>(null);

// 3. 创建 Form 引用
const formRef = ref<FormInstance>();

// 监听本地表单变化，同步到 Store
watch(
  formData,
  (newVal) => {
    wizardStore.setSourceConfig({ ...newVal });
  },
  { deep: true }
);
// 1. 监听 Store 变化，自动回填表单（核心解决方案）
watch(
  () => wizardStore.sourceConfig,
  (newVal) => {
    if (
      newVal &&
      typeof newVal === "object" &&
      Object.keys(newVal).length > 0
    ) {
      // 简单的防抖或判断可以避免不必要的更新，但在表单初始化场景下直接赋值通常没问题
      // 注意：这会触发 formData 的 watch，进而再次更新 Store。
      // 如果 Store 的 setter 是直接替换，这可能导致无限循环。
      // 检查你的 Store setSourceConfig 实现。如果是 this.sourceConfig = val，通常没事。
      // 为了安全，可以比较一下关键字段
      if (
        newVal.kafka !== formData.kafka ||
        newVal.topic !== formData.topic ||
        newVal.groupId !== formData.groupId ||
        newVal.consumePosition !== formData.consumePosition ||
        newVal.timestamp !== formData.timestamp ||
        newVal.dataFormat !== formData.dataFormat ||
        newVal.isKeyTableName !== formData.isKeyTableName ||
        newVal.tableNameFilter !== formData.tableNameFilter
      ) {
        Object.assign(formData, newVal);
      }
    }
  },
  { deep: true }
);
// 组件挂载时，从 Store 恢复数据（用于编辑模式或刷新后恢复）
onMounted(() => {
  console.log("sourceConfig onMounted");
  // 页面加载时获取 Kafka 列表
  loadKafkaOptions();
  console.log("wizardStore.sourceConfig:", wizardStore.sourceConfig);
  Object.assign(formData, wizardStore.sourceConfig);
  // if (Object.keys(wizardStore.sourceConfig).length > 0) {
  //   console.log("wizardStore.sourceConfig:", wizardStore.sourceConfig);
  //   Object.assign(formData, wizardStore.sourceConfig);
  // }
});
onActivated(() => {
  console.log("sourceConfig onActivated");
  // 激活时也可以尝试同步，以防 watch 没覆盖到的边缘情况
  if (wizardStore.sourceConfig && wizardStore.sourceConfig.kafka) {
    Object.assign(formData, wizardStore.sourceConfig);
  }
});

// 加载 Kafka 选项
const loadKafkaOptions = async () => {
  loadingKafka.value = true;

  // TODO: 实现真实的 API 请求获取 Kafka 集群列表
  // 示例代码如下（需要替换为实际的 API 调用）：
  /*
  try {
    const response = await someAPIEndpoint.fetchKafkaClusters();
    kafkaOptions.value = response.data.map(item => ({
      label: item.name,
      value: item.id
    }));
  } catch (error) {
    console.error('Failed to load Kafka clusters:', error);
    message.error('获取 Kafka 集群列表失败');
    kafkaOptions.value = [];
  }
  */

  // 模拟 API 请求延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 模拟返回的 Kafka 数据，实际应用中应从 API 获取
  kafkaOptions.value = [
    { label: "kafka-test", value: "kafka-test" },
    { label: "kafka2", value: "kafka2" },
    { label: "kafka3", value: "kafka3" },
  ];

  loadingKafka.value = false;
};

// 当 Kafka 选择改变时，加载对应的 Topics
const onKafkaChange = async () => {
  // 清空之前的选择
  formData.topic = "";
  formData.schemaDefinition = "";
  topicOptions.value = [];
  schemaOptions.value = [];

  if (!formData.kafka) return;

  // 模拟加载 Topics
  loadingTopics.value = true;

  // TODO: 实现真实的 API 请求获取 Topics 数据
  // 示例代码如下（需要替换为实际的 API 调用）：
  /*
  try {
    const response = await someAPIEndpoint.fetchTopicsByKafka(formData.kafka);
    topicOptions.value = response.data.map(item => ({
      label: item.name,
      value: item.id
    }));
  } catch (error) {
    console.error('Failed to load topics:', error);
    message.error('获取 Topic 列表失败');
    topicOptions.value = [];
  }
  */

  // 模拟 API 请求延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 模拟返回的 Topics 数据，实际应用中应从 API 获取
  topicOptions.value = [
    { label: "tprds-dc-order-bak", value: "tprds-dc-order-bak" },
  ];

  loadingTopics.value = false;
};

// 当 Topic 选择改变时，加载对应的 Schemas
watch(
  () => formData.topic,
  async (newTopic) => {
    if (!newTopic) {
      formData.schemaDefinition = "";
      schemaOptions.value = [];
      return;
    }

    loadingSchemas.value = true;

    // TODO: 实现真实的 API 请求获取 Schema 数据，需要传递 kafka 和 topic 参数
    // 示例代码如下（需要替换为实际的 API 调用）：
    /*
    try {
      const response = await someAPIEndpoint.fetchSchemasByKafkaAndTopic({
        kafka: formData.kafka,
        topic: formData.topic
      });
      schemaOptions.value = response.data.map(item => ({
        label: item.name,
        value: item.id
      }));
    } catch (error) {
      console.error('Failed to load schemas:', error);
      message.error('获取表名列表失败');
      schemaOptions.value = [];
    }
    */

    // 模拟 API 请求延迟
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 模拟返回的 Schema 数据，实际应用中应从 API 获取
    schemaOptions.value = [
      { label: "TF_B_TRADE_RELATION", value: "TF_B_TRADE_RELATION" },
    ];

    loadingSchemas.value = false;
  }
);

// Schema 选项过滤函数
const filterSchemaOption = (input: string, option?: SelectOption) => {
  if (!input) return true;
  const lowerInput = input.toLowerCase();
  return (
    (option?.label && option.label.toLowerCase().includes(lowerInput)) ||
    (option?.value && option.value.toLowerCase().includes(lowerInput))
  );
};

const handleTest = () => {
  const configValues = Object.entries(formData)
    .map(([key, value]) => `${key}:${value}`)
    .join("\n");
  alert(configValues);
};

// 测试数据结构
const testDataStructure = async () => {
  try {
    await formRef.value?.validate();
    const dataToSubmit = getDataToSubmit();
    console.log("验证通过，数据:", dataToSubmit);
    message.info("数据结构已打印到控制台，请查看");
  } catch (error) {
    console.error("表单验证失败:", error);
    message.error("请检查表单填写是否正确");
  }
};

// 获取要提交的数据
const getDataToSubmit = (): SourceConfigFormData => {
  return {
    kafka: formData.kafka,
    topic: formData.topic,
    groupId: formData.groupId,
    consumePosition: formData.consumePosition,
    timestamp: formData.timestamp,
    dataFormat: formData.dataFormat,
    isKeyTableName: formData.isKeyTableName,
    tableNameFilter: formData.tableNameFilter,
    schemaDefinition: formData.schemaDefinition,
  };
};

// 新增：处理日期变化，转换为东八区时间戳（毫秒部分为0）
const onDateChange = (date: dayjs.Dayjs | null) => {
  if (!date) {
    formData.timestamp = "";
    selectedDate.value = null;
    return;
  }

  try {
    // 将毫秒部分设置为0，然后转换为东八区 (Asia/Shanghai) 的时间戳 (毫秒)
    const dateWithoutMs = date.millisecond(0);
    const timestamp = dateWithoutMs.tz("Asia/Shanghai").valueOf();

    // 赋值给 formData
    formData.timestamp = timestamp.toString();

    console.log("选择的时间:", date.format("YYYY-MM-DD HH:mm:ss"));
    console.log("转换后的东八区时间戳(毫秒为0):", formData.timestamp);
  } catch (error) {
    console.error("时间转换失败:", error);
    message.error("时间转换失败");
  }
};

// 监听 formData.timestamp 的变化，反向更新 selectedDate（用于编辑模式回显）
watch(
  () => formData.timestamp,
  (newTimestamp) => {
    if (newTimestamp) {
      // 将时间戳转回东八区的日期对象供 DatePicker 显示
      selectedDate.value = dayjs(Number(newTimestamp)).tz("Asia/Shanghai");
    } else {
      selectedDate.value = null;
    }
  },
  { immediate: true }
);

// 如果需要暴露方法供父组件调用，可以保留，但实际已不需要
defineExpose({
  getDataToSubmit,
  testDataStructure,
  validate: () => formRef.value?.validate(),
});
</script>

<style scoped>
.card-title {
  display: flex;
  gap: 12px;
  align-items: center;
}

.title-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #177ddc 0%, #096dd9 100%);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgb(23 125 220 / 30%);
}

.config-content {
  padding: 20px 0;
}

/* 新增：为配置内容区域添加左右内边距 */
.config-content-wrapper {
  padding: 0 20px; /* 添加左右内边距 */
}

.custom-label :deep(.ant-form-item-label) label {
  font-size: 15px;
  font-weight: 490;
  color: #262626;
}

.radio-group-spacing {
  display: flex;
  gap: 24px;
}

.radio-group-spacing :deep(.ant-radio-wrapper) {
  display: flex;
  align-items: center;
}

/* 新增：确保 Card 组件没有边框 */
:deep(.ant-card-bordered) {
  border: none !important;
}
</style>
<script lang="ts">
export default {};
</script>
