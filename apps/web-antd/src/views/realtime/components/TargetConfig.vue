<template>
  <div>
    <Card class="mb-4" :bordered="false">
      <template #title>
        <span class="card-title">
          <span class="title-badge">02</span>
          目标端配置
        </span>
      </template>

      <div class="config-content-wrapper">
        <div class="config-content">
          <!-- 配置内容区域 -->
          <Form ref="formRef" :model="formData" layout="vertical">
            <Row :gutter="24">
              <Col :span="8">
                <Form.Item
                  label="Catalog"
                  class="custom-label"
                  name="catalog"
                  :rules="[{ required: true, message: '请选择Catalog' }]"
                >
                  <Select
                    v-model:value="formData.catalog"
                    placeholder="请选择Catalog"
                    :loading="loadingCatalog"
                    :disabled="!catalogOptions.length"
                    @change="onCatalogChange"
                    style="width: 100%"
                  >
                    <Option
                      v-for="item in catalogOptions"
                      :key="item.value"
                      :value="item.value"
                      >{{ item.label }}</Option
                    >
                  </Select>
                </Form.Item>
              </Col>
              <Col :span="8">
                <Form.Item 
                  label="数据库" 
                  class="custom-label" 
                  name="database"
                  :rules="[{ required: true, message: '请选择数据库' }]"
                >
                  <Select
                    v-model:value="formData.database"
                    placeholder="请选择数据库"
                    :loading="loadingDatabase"
                    :disabled="!formData.catalog"
                    @change="onDatabaseChange"
                    style="width: 100%"
                  >
                    <Option
                      v-for="item in databaseOptions"
                      :key="item.value"
                      :value="item.value"
                      >{{ item.label }}</Option
                    >
                  </Select>
                </Form.Item>
              </Col>
              <Col :span="8">
                <Form.Item 
                  label="表" 
                  class="custom-label" 
                  name="table"
                  :rules="[{ required: true, message: '请选择表' }]"
                >
                  <Select
                    v-model:value="formData.table"
                    placeholder="请选择表"
                    :loading="loadingTable"
                    :disabled="!formData.database"
                    style="width: 100%"
                  >
                    <Option
                      v-for="item in tableOptions"
                      :key="item.value"
                      :value="item.value"
                      >{{ item.label }}</Option
                    >
                  </Select>
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
  Row,
  Col,
  Button,
  message,
} from "ant-design-vue";
import type { FormInstance } from "ant-design-vue"; // 引入 FormInstance 类型

// 定义选项数据
const catalogOptions = ref<{ label: string; value: string }[]>([]);
const databaseOptions = ref<{ label: string; value: string }[]>([]);
const tableOptions = ref<{ label: string; value: string }[]>([]);

// 加载状态
const loadingCatalog = ref(false);
const loadingDatabase = ref(false);
const loadingTable = ref(false);

const formData = reactive({
  catalog: "",
  database: "",
  table: "",
});

// 3. 创建 Form 引用
const formRef = ref<FormInstance>();

// 使用 Store
const wizardStore = useRealtimeWizardStore();

// 监听本地表单变化，同步到 Store
watch(
  formData,
  (newVal) => {
    wizardStore.setTargetConfig({ ...newVal });
  },
  { deep: true }
);

// 1. 监听 Store 变化，自动回填表单（核心解决方案）
watch(
  () => wizardStore.targetConfig,
  (newVal) => {
    if (
      newVal &&
      typeof newVal === "object" &&
      Object.keys(newVal).length > 0
    ) {
      // 防止死循环：简单判断关键字段是否不同
      if (newVal.catalog !== formData.catalog) {
        Object.assign(formData, newVal);
      }
    }
  },
  { deep: true }
);

// 组件挂载时，从 Store 恢复数据（用于编辑模式或刷新后恢复）
onMounted(() => {
  // 页面加载时获取 Flink 环境列表
  loadCatalogOptions();

  if (Object.keys(wizardStore.targetConfig).length > 0) {
    Object.assign(formData, wizardStore.targetConfig);
  }
});

onActivated(() => {
  console.log("targetConfig onActivated");
  // 激活时也可以尝试同步，以防 watch 没覆盖到的边缘情况
  if (wizardStore.targetConfig && wizardStore.targetConfig.catalog) {
    Object.assign(formData, wizardStore.targetConfig);
  }
});

// 加载 Catalog 选项
const loadCatalogOptions = async () => {
  loadingCatalog.value = true;

  // TODO: 实现真实的 API 请求获取 Catalog 列表
  // 示例代码如下（需要替换为实际的 API 调用）：
  /*
  try {
    const response = await someAPIEndpoint.fetchCatalogsByFlinkEnv(formData.flinkEnv);
    catalogOptions.value = response.data.map(item => ({
      label: item.name,
      value: item.id
    }));
  } catch (error) {
    console.error('Failed to load catalogs:', error);
    message.error('获取 Catalog 列表失败');
    catalogOptions.value = [];
  }
  */

  // 模拟 API 请求延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 模拟返回的 Catalog 数据
  catalogOptions.value = [{ label: "paimon", value: "paimon" }];

  loadingCatalog.value = false;
};

// 加载数据库选项
const loadDatabaseOptions = async () => {
  loadingDatabase.value = true;

  // TODO: 实现真实的 API 请求获取数据库列表
  // 示例代码如下（需要替换为实际的 API 调用）：
  /*
  try {
    const response = await someAPIEndpoint.fetchDatabasesByCatalog(formData.catalog);
    databaseOptions.value = response.data.map(item => ({
      label: item.name,
      value: item.id
    }));
  } catch (error) {
    console.error('Failed to load databases:', error);
    message.error('获取数据库列表失败');
    databaseOptions.value = [];
  }
  */

  // 模拟 API 请求延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 模拟返回的数据库数据
  databaseOptions.value = [{ label: "paimon_src", value: "paimon_src" }];

  loadingDatabase.value = false;
};

// 加载表选项
const loadTableOptions = async () => {
  loadingTable.value = true;

  // TODO: 实现真实的 API 请求获取表列表
  // 示例代码如下（需要替换为实际的 API 调用）：
  /*
  try {
    const response = await someAPIEndpoint.fetchTablesByDatabase(formData.database);
    tableOptions.value = response.data.map(item => ({
      label: item.name,
      value: item.id
    }));
  } catch (error) {
    console.error('Failed to load tables:', error);
    message.error('获取表列表失败');
    tableOptions.value = [];
  }
  */

  // 模拟 API 请求延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  // 模拟返回的表数据
  tableOptions.value = [
    { label: "src_d_bcd02007_t", value: "src_d_bcd02007_t" },
  ];

  loadingTable.value = false;
};

const onCatalogChange = async () => {
  // 清空数据库和表的选择
  formData.database = "";
  formData.table = "";
  databaseOptions.value = [];
  tableOptions.value = [];

  if (!formData.catalog) return;

  // 加载对应的数据库选项
  await loadDatabaseOptions();
};

const onDatabaseChange = async () => {
  // 清空表的选择
  formData.table = "";
  tableOptions.value = [];

  if (!formData.database) return;

  // 加载对应的表选项
  await loadTableOptions();
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
    catalog: formData.catalog,
    database: formData.database,
    table: formData.table,
  };
};

// 如果需要暴露方法供父组件调用，可以保留，但实际已不需要
defineExpose({
  getDataToSubmit,
  testDataStructure,
  validate: () => formRef.value?.validate()
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
