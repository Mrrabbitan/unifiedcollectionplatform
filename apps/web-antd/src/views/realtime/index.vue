<script lang="ts" setup>
import { Page } from "@vben/common-ui";
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter, useRoute } from "vue-router";

import { Button, Card, Steps, Step, message, Spin } from "ant-design-vue";

// 引入 Store
import { useRealtimeWizardStore } from "#/store/realtime-wizard";
import { useProjectStore } from "#/store";
// 引入 API
import {
  saveRealtimeConfig,
  updateRealtimeConfig,
  getRealtimeConfig,
} from "#/api/realtime";

import SourceConfig from "./components/SourceConfig.vue";
import TargetConfig from "./components/TargetConfig.vue";
import FieldMapping from "./components/FieldMapping.vue";
import RuntimeConfig from "./components/RuntimeConfig.vue";

// 使用 Store
const wizardStore = useRealtimeWizardStore();
const router = useRouter();
const route = useRoute();

// 加载状态
const pageLoading = ref(false);

// 判断是否为编辑模式
const workflowId = computed(() => (route.query.code as string) || "");
const isEditMode = computed(() => workflowId.value !== "");
console.log("当前任务是否为编辑模式:", isEditMode.value);
console.log("当前任务ID:", workflowId.value);

// 定义当前步骤
const currentStep = ref(0); // 0: 源端, 1: 目标端, 2: 字段映射, 3: 运行配置

// 步骤总数
const totalSteps = 4;

// 获取各组件的引用
const sourceConfigRef = ref<InstanceType<typeof SourceConfig> | null>(null);
const targetConfigRef = ref<InstanceType<typeof TargetConfig> | null>(null);
const fieldMappingRef = ref<InstanceType<typeof FieldMapping> | null>(null); // 添加字段映射组件引用
const runtimeConfigRef = ref<InstanceType<typeof RuntimeConfig> | null>(null);

// 加载任务详情数据
const loadTaskDetail = async () => {
  if (!isEditMode.value || !workflowId.value) return;

  pageLoading.value = true;
  try {
    // 1. 调用 API 获取详情
    const projectStore = useProjectStore();
    const projectCode = projectStore.currentProjectCode;
    if (!projectCode) {
      message.error("请先选择项目");
      return;
    }

    const res = await getRealtimeConfig(Number(workflowId.value));

    console.log("加载到的任务详情:", res);

    // 2. 将数据回填到 Store
    wizardStore.setSourceConfig(res.sourceConfig);
    wizardStore.setTargetConfig(res.targetConfig);
    wizardStore.setFieldMapping(res.fieldMapping);
    wizardStore.setRuntimeConfig(res.runtimeConfig);

    // 3. 如果有需要，可以重置当前步骤到第一步，或者保持在最后一步
    currentStep.value = 0;
  } catch (error) {
    console.error("加载任务详情失败", error);
    message.error("加载任务详情失败");
    // 加载失败返回列表页
    router.push("/realtime/list");
  } finally {
    pageLoading.value = false;
  }
};

// 在组件挂载时加载数据
onMounted(() => {
  loadTaskDetail();
});

onUnmounted(() => {
  // 可选：离开页面时也清空，防止内存泄漏或状态污染
  // 如果希望保留草稿供下次快速恢复，可以注释掉这行，仅依靠 onMounted 的判断
  wizardStore.reset();
});
// 处理下一步操作
const handleNext = async () => {
  if (currentStep.value === 0) {
    // 如果当前是源端配置步骤 (step 0)，则进行校验
    try {
      // 调用子组件暴露的 validate 方法
      await sourceConfigRef.value?.validate();
      // 校验通过，进入下一步
      if (currentStep.value < totalSteps - 1) {
        currentStep.value++;
      }
    } catch (error) {
      // 校验失败，Ant Design Vue 会自动显示错误信息，这里可以不做额外处理，或者提示用户
      console.log("源端配置校验失败", error);
      message.error("请完善源端配置信息");
    }
  } else if (currentStep.value === 1) {
    // 如果当前是目标端配置步骤 (step 1)，则进行校验
    try {
      await targetConfigRef.value?.validate();
      // 校验通过，进入下一步
      if (currentStep.value < totalSteps - 1) {
        currentStep.value++;
      }
    } catch (error) {
      console.log("目标端配置校验失败", error);
      message.error("请完善目标端配置信息");
    }
  } else if (currentStep.value === 2) {
    // 如果当前是字段映射步骤 (step 2)，则进行校验
    try {
      await fieldMappingRef.value?.validate();
      // 校验通过，进入下一步
      if (currentStep.value < totalSteps - 1) {
        currentStep.value++;
      }
    } catch (error) {
      console.log("字段映射校验失败", error);
      message.error("请完善字段映射信息");
    }
  } else {
    // 其他步骤（如运行配置）直接下一步，不在这里校验运行配置
    if (currentStep.value < totalSteps - 1) {
      currentStep.value++;
    }
  }
};

// 处理上一步操作
const handlePrev = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

// 处理保存操作
const handleSave = async () => {
  console.log("开始执行保存/更新操作...");

  try {
    // 1. 依次校验所有需要校验的步骤
    console.log("正在校验源端配置...");
    await sourceConfigRef.value?.validate();

    console.log("正在校验目标端配置...");
    await targetConfigRef.value?.validate();

    // 2. 校验运行配置 (RuntimeConfig)
    console.log("正在校验运行配置...");
    await runtimeConfigRef.value?.validate();

    // 3. 所有校验通过后，获取数据并保存
    const allFormData = wizardStore.getAllData();
    console.log("所有数据:", allFormData);

    const { sourceConfig, targetConfig, fieldMapping, runtimeConfig } =
      allFormData;

    console.log("提交的拆分参数:", {
      sourceConfig,
      targetConfig,
      fieldMapping,
      runtimeConfig,
    });

    console.log("正在调用后台 API...");

    // 4. 根据是否为编辑模式决定调用哪个API
    if (isEditMode.value) {
      // 编辑模式，调用更新接口
      await updateRealtimeConfig(workflowId.value, {
        sourceConfig,
        targetConfig,
        fieldMapping,
        runtimeConfig,
      });
      console.log("更新API调用成功");
      message.success("数据更新成功");
    } else {
      // 新增模式，调用保存接口
      await saveRealtimeConfig({
        sourceConfig,
        targetConfig,
        fieldMapping,
        runtimeConfig,
      });
      console.log("保存API调用成功");
      message.success("数据保存成功");
    }

    // 保存/更新成功后重定向到列表页或其他页面
    router.push("/realtime/list");
  } catch (error) {
    console.error("保存/更新失败或校验未通过:", error);
    // 区分是校验失败还是API失败，Antd Form validate 失败会抛出异常
    // 这里统一提示，或者可以根据 error 类型做更细致的提示
    message.error("请检查表单填写是否正确或保存失败");
  }
};

// 跳转到指定步骤
const goToStep = (step: number) => {
  // 可选：跳转前也可以加校验，防止用户通过点击步骤条跳过校验
  // 这里暂时保持原样，只允许通过"下一步"按钮触发校验
  currentStep.value = step;
};
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="pageLoading" tip="正在加载任务配置...">
      <div class="realtime-container">
        <Card class="steps-card" size="small">
          <Steps :current="currentStep" size="small" @change="goToStep">
            <Step title="源端配置" description="配置源端数据源" />
            <Step title="目标端配置" description="配置目标端数据源" />
            <Step title="字段映射" description="配置字段映射关系" />
            <Step title="运行配置" description="配置任务运行参数" />
          </Steps>
        </Card>

        <Card class="content-card" size="small">
          <!-- 使用 v-show 控制组件显示 -->
          <div v-show="currentStep === 0">
            <SourceConfig ref="sourceConfigRef" />
          </div>

          <div v-show="currentStep === 1">
            <TargetConfig ref="targetConfigRef" />
          </div>

          <div v-show="currentStep === 2">
            <FieldMapping ref="fieldMappingRef" />
          </div>

          <div v-show="currentStep === 3">
            <RuntimeConfig ref="runtimeConfigRef" />
          </div>

          <!-- 步骤导航按钮 -->
          <div class="step-actions">
            <Button v-if="currentStep > 0" @click="handlePrev"> 上一步 </Button>
            <Button
              v-if="currentStep < totalSteps - 1"
              type="primary"
              @click="handleNext"
            >
              下一步
            </Button>
            <Button
              v-if="currentStep === totalSteps - 1"
              type="primary"
              @click="handleSave"
            >
              {{ isEditMode ? "更新" : "保存" }}
            </Button>
            <Button @click="router.go(-1)"> 取消 </Button>
          </div>
        </Card>
      </div>
    </Spin>
  </Page>
</template>

<style scoped>
.realtime-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.steps-card {
  flex-shrink: 0;
}

.content-card {
  flex: 1;
  overflow: auto;
}

.step-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  gap: 8px;
}
</style>
