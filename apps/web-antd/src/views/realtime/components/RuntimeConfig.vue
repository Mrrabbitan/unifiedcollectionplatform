<template>
  <div>
    <Card class="mb-4" :bordered="false">
      <template #title>
        <span class="card-title">
          <span class="title-badge">04</span>
          运行配置
        </span>
      </template>

      <div class="config-content-wrapper">
        <div class="config-content">
          <!-- 配置内容区域 -->
          <Form ref="formRef" :model="formData" layout="vertical">
            <Row :gutter="24">
              <Col :span="12">
                <Form.Item
                  label="任务名称"
                  class="custom-label"
                  name="taskName"
                  :rules="[{ required: true, message: '请输入任务名称' }]"
                >
                  <Input
                    v-model:value="formData.taskName"
                    placeholder="请输入"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row :gutter="24">
              <Col :span="12">
                <Form.Item
                  label="任务优先级"
                  class="custom-label"
                  name="priority"
                  :rules="[{ required: true, message: '请选择任务优先级' }]"
                >
                  <Select v-model:value="formData.priority" style="width: 100%">
                    <Option
                      v-for="option in priorityOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col :span="12">
                <!-- 新增：Worker分组 -->
                <Form.Item
                  label="Worker分组"
                  class="custom-label"
                  name="workerGroup"
                  :rules="[{ required: true, message: '请选择Worker分组' }]"
                >
                  <Select
                    v-model:value="formData.workerGroup"
                    style="width: 100%"
                  >
                    <Option
                      v-for="option in workerGroupOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row :gutter="24">
              <Col :span="12">
                <Form.Item
                  label="环境名称"
                  class="custom-label"
                  name="flinkEnvironment"
                  :rules="[{ required: true, message: '请选择环境名称' }]"
                >
                  <Select
                    v-model:value="formData.flinkEnvironment"
                    :loading="loadingFlinkEnv"
                    style="width: 100%"
                  >
                    <Option
                      v-for="env in flinkEnvironmentOptions"
                      :key="env.value"
                      :value="env.value"
                    >
                      {{ env.label }}
                    </Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <!-- 新增：失败重试次数 -->
            <Row :gutter="24">
              <Col :span="12">
                <Form.Item
                  label="失败重试次数（次）"
                  class="custom-label"
                  name="retryCount"
                  :rules="[{ required: true, message: '请输入失败重试次数' }]"
                >
                  <InputNumber
                    v-model:value="formData.retryCount"
                    :min="0"
                    :max="100"
                    placeholder="请输入"
                    style="width: 100%"
                  />
                </Form.Item>
              </Col>
              <Col :span="12">
                <!-- 新增：失败重试间隔 -->
                <Form.Item
                  label="失败重试间隔（分）"
                  class="custom-label"
                  name="retryInterval"
                  :rules="[{ required: true, message: '请输入失败重试间隔' }]"
                >
                  <InputNumber
                    v-model:value="formData.retryInterval"
                    placeholder="失败重试间隔"
                    style="width: 100%"
                  />
                </Form.Item>
              </Col>
            </Row>

            <!-- 新增：延时执行时间 -->
            <Row :gutter="24">
              <Col :span="12">
                <Form.Item
                  label="延时执行时间（分）"
                  class="custom-label"
                  name="timeoutDelay"
                  :rules="[{ required: true, message: '请输入延时执行时间' }]"
                >
                  <InputNumber
                    v-model:value="formData.timeoutDelay"
                    placeholder="延时执行时间"
                    style="width: 100%"
                  />
                </Form.Item>
              </Col>
              <!-- 新增：超时告警 -->
              <Col :span="12">
                <Form.Item label="超时告警" class="custom-label" hidden="true">
                  <Switch
                    v-model:checked="formData.timeoutAlert"
                    size="small"
                  />
                </Form.Item>
              </Col>
            </Row>
            <Row :gutter="24">
              <Col :span="12">
                <Form.Item
                  label="部署模式"
                  class="custom-label"
                  name="deploymentMode"
                  :rules="[{ required: true, message: '请选择部署模式' }]"
                >
                  <Radio.Group v-model:value="formData.deploymentMode">
                    <Radio value="cluster">per-job/cluster</Radio>
                    <Radio value="local">local</Radio>
                    <Radio value="standalone">standalone</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col :span="12">
                <Form.Item
                  label="YARN队列"
                  class="custom-label"
                  name="yarnQueue"
                  :rules="[{ required: true, message: '请输入YARN队列' }]"
                >
                  <Input v-model:value="formData.yarnQueue" placeholder="" />
                </Form.Item>
              </Col>
            </Row>

            <Row :gutter="24">
              <Col :span="12">
                <Form.Item
                  label="JobManager内存"
                  class="custom-label"
                  name="jobManagerMemory"
                  :rules="[{ required: true, message: '请输入JobManager内存' }]"
                >
                  <Input
                    v-model:value="formData.jobManagerMemory"
                    :min="1"
                    placeholder="请输入"
                    style="width: 100%"
                  />
                </Form.Item>
              </Col>
              <Col :span="12">
                <Form.Item
                  label="TaskManager内存"
                  class="custom-label"
                  name="taskManagerMemory"
                  :rules="[
                    { required: true, message: '请输入TaskManager内存' },
                  ]"
                >
                  <Input
                    v-model:value="formData.taskManagerMemory"
                    :min="1"
                    placeholder="请输入"
                    style="width: 100%"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row :gutter="24">
              <Col :span="12">
                <Form.Item
                  label="Slot数量"
                  class="custom-label"
                  name="slotCount"
                  :rules="[{ required: true, message: '请输入Slot数量' }]"
                >
                  <InputNumber
                    v-model:value="formData.slotCount"
                    :min="1"
                    placeholder="请输入"
                    style="width: 100%"
                  />
                </Form.Item>
              </Col>
              <Col :span="12">
                <Form.Item
                  label="并行度"
                  class="custom-label"
                  name="parallelism"
                  :rules="[{ required: true, message: '请输入并行度' }]"
                >
                  <InputNumber
                    v-model:value="formData.parallelism"
                    :min="1"
                    placeholder="请输入"
                    style="width: 100%"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row :gutter="24">
              <Col :span="12">
                <Form.Item
                  label="Checkpoints间隔时间（毫秒）"
                  class="custom-label"
                  name="checkpointInterval"
                  :rules="[
                    { required: true, message: '请输入Checkpoints间隔时间' },
                  ]"
                >
                  <InputNumber
                    v-model:value="formData.checkpointInterval"
                    :min="1"
                    placeholder="请输入"
                    style="width: 100%"
                  />
                </Form.Item>
              </Col>
              <Col :span="12">
                <Form.Item
                  label="Checkpoints存储路径"
                  class="custom-label"
                  name="stateStoragePath"
                  :rules="[
                    { required: true, message: '请输入Checkpoints存储路径' },
                  ]"
                >
                  <Input
                    v-model:value="formData.stateStoragePath"
                    placeholder="请输入"
                  />
                </Form.Item>
              </Col>
            </Row>

            <!-- 新增：Checkpoints超时时间 -->
            <Row :gutter="24">
              <Col :span="12">
                <Form.Item
                  label="Checkpoints超时时间（毫秒）"
                  class="custom-label"
                  name="checkpointTimeout"
                  :rules="[
                    { required: true, message: '请输入Checkpoints超时时间' },
                  ]"
                >
                  <Input
                    v-model:value="formData.checkpointTimeout"
                    placeholder="请输入Checkpoints超时时间"
                    style="width: 100%"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from "vue";
import { onActivated } from "vue"; // 引入 onActivated
import { useRealtimeWizardStore } from "#/store/realtime-wizard";
import {
  Card,
  Form,
  Select,
  Input,
  InputNumber,
  Row,
  Col,
  Button,
  message,
  Switch,
  Radio,
} from "ant-design-vue";
import type { FormInstance } from "ant-design-vue";

// 引入环境列表 API
import { getEnvironmentListApi, type EnvironmentInfo } from "#/api/environment";

const { Option } = Select;

// 使用 Store
const wizardStore = useRealtimeWizardStore();

// 3. 创建 Form 引用
const formRef = ref<FormInstance>();

// 定义选项数据 - 更新类型为支持数字和字符串
const flinkEnvironmentOptions = ref<
  { label: string; value: number | string }[]
>([]);
const priorityOptions = ref([
  { label: "LOWEST", value: "LOWEST" },
  { label: "LOW", value: "LOW" },
  { label: "MEDIUM", value: "MEDIUM" },
  { label: "HIGH", value: "HIGH" },
  { label: "HIGHEST", value: "HIGHEST" },
]);

const workerGroupOptions = ref([{ label: "default", value: "default" }]);

// 加载状态
const loadingFlinkEnv = ref(false);

const formData = reactive({
  taskName: "",
  deploymentMode: "cluster", // 默认选择 perjob/cluster
  yarnQueue: "",
  jobManagerMemory: "2G",
  taskManagerMemory: "4G",
  slotCount: 2,
  parallelism: 4,
  checkpointInterval: 600000,
  stateStoragePath: "",
  flinkEnvironment: "" as number | string, // 修改类型以兼容环境 ID
  priority: "MEDIUM",
  workerGroup: "default",
  retryCount: 0,
  retryInterval: 5,
  timeoutAlert: false,
  timeoutDelay: 0,
  checkpointTimeout: 600000,
});

// 监听本地表单变化，同步到 Store
watch(
  formData,
  (newVal) => {
    wizardStore.setRuntimeConfig({ ...newVal });
  },
  { deep: true }
);

// 1. 监听 Store 变化，自动回填表单（核心解决方案）
watch(
  () => wizardStore.runtimeConfig,
  (newVal) => {
    if (
      newVal &&
      typeof newVal === "object" &&
      Object.keys(newVal).length > 0
    ) {
      // 防止死循环：简单判断关键字段是否不同
      if (newVal.taskName !== formData.taskName) {
        Object.assign(formData, newVal);
      }
    }
  },
  { deep: true }
);

// 组件挂载时，从 Store 恢复数据并加载 Flink 环境列表
onMounted(() => {
  // 1. 优先加载 Flink 环境列表
  loadFlinkEnvOptions();

  // 2. 如果 Store 中有之前保存的数据，恢复它
  if (Object.keys(wizardStore.runtimeConfig).length > 0) {
    Object.assign(formData, wizardStore.runtimeConfig);
  }
});

onActivated(() => {
  console.log("runtimeConfig onActivated");
  // 激活时也可以尝试同步，以防 watch 没覆盖到的边缘情况
  if (wizardStore.runtimeConfig && wizardStore.runtimeConfig.taskName) {
    Object.assign(formData, wizardStore.runtimeConfig);
  }
});

// 加载 Flink 环境选项 - 使用真实接口
const loadFlinkEnvOptions = async () => {
  loadingFlinkEnv.value = true;
  try {
    // 调用与 index.vue 相同的接口
    const res = await getEnvironmentListApi();

    // 映射数据格式：label 为环境名称，value 为环境 code (通常是数字)
    flinkEnvironmentOptions.value = (res || []).map(
      (item: EnvironmentInfo) => ({
        label: item.name,
        value: item.code,
      })
    );

    // 如果列表不为空且当前未选择环境，默认选中第一个
    // if (flinkEnvironmentOptions.value.length > 0 && !formData.flinkEnvironment) {
    //   formData.flinkEnvironment = flinkEnvironmentOptions.value[0]?.value;
    // }
  } catch (error) {
    console.error("获取环境列表失败:", error);
    message.error("获取环境列表失败");
    flinkEnvironmentOptions.value = [];
  } finally {
    loadingFlinkEnv.value = false;
  }
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
const getDataToSubmit = () => {
  return {
    taskName: formData.taskName,
    deploymentMode: formData.deploymentMode,
    yarnQueue: formData.yarnQueue,
    jobManagerMemory: formData.jobManagerMemory,
    taskManagerMemory: formData.taskManagerMemory,
    slotCount: formData.slotCount,
    parallelism: formData.parallelism,
    checkpointInterval: formData.checkpointInterval,
    stateStoragePath: formData.stateStoragePath,
    flinkEnvironment: formData.flinkEnvironment,
    priority: formData.priority,
    workerGroup: formData.workerGroup,
    retryCount: formData.retryCount,
    retryInterval: formData.retryInterval,
    timeoutAlert: formData.timeoutAlert,
    timeoutDelay: formData.timeoutDelay,
    checkpointTimeout: formData.checkpointTimeout,
  };
};

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

.config-content-wrapper {
  padding: 0 20px 20px;
}

.config-content {
  padding: 20px 0;
}

.custom-label :deep(.ant-form-item-label) label {
  font-size: 15px;
  font-weight: 500;
  color: #262626;
}

/* 确保 Card 组件没有边框 */
:deep(.ant-card-bordered) {
  border: none !important;
}
</style>

<script lang="ts">
export default {};
</script>
