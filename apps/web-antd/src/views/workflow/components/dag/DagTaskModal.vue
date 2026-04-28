<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { Modal, Alert } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import type { VbenFormSchema } from '#/adapter/form';

import type { TaskDefinition, TaskType } from './types';
import { TASK_TYPE_LABELS } from './types';
import { getTaskFormSchema } from './task-form-configs';
import SqlTaskForm from './SqlTaskForm.vue';
import RemoteShellTaskForm from './RemoteShellTaskForm.vue';

const props = defineProps<{
  visible: boolean;
  taskData?: Partial<TaskDefinition>;
  readonly?: boolean;
  availableNodes?: { code: number; name: string }[];
  preTasks?: number[];
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  save: [task: Partial<TaskDefinition>, preTasks: number[]];
  cancel: [];
}>();

const currentTaskType = ref<TaskType>('SHELL');
const sqlFormData = ref<any>({});
const remoteShellFormData = ref<any>({});
const currentPreTasks = ref<number[]>([]);

const taskTypeOptions = Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const taskTypeSchema: VbenFormSchema[] = [
  {
    component: 'Select',
    fieldName: 'taskType',
    label: '任务类型',
    rules: 'required',
    componentProps: {
      options: taskTypeOptions,
      placeholder: '请选择任务类型',
    },
  },
];

const [TaskTypeForm, taskTypeFormApi] = useVbenForm({
  commonConfig: {
    labelWidth: 100,
  },
  schema: taskTypeSchema,
  showDefaultActions: false,
});

const isSqlTask = computed(() => currentTaskType.value === 'SQL');
const isRemoteShellTask = computed(() => currentTaskType.value === 'REMOTESHELL');

const currentFormSchema = computed<VbenFormSchema[]>(() => {
  if (isSqlTask.value || isRemoteShellTask.value) {
    return [];
  }
  return getTaskFormSchema(currentTaskType.value);
});

const [TaskForm, taskFormApi] = useVbenForm({
  commonConfig: {
    labelWidth: 120,
  },
  schema: currentFormSchema.value,
  showDefaultActions: false,
});

watch(
  () => currentFormSchema.value,
  (newSchema) => {
    if (newSchema.length > 0) {
      taskFormApi.setState({ schema: newSchema });
    }
  },
  { deep: true }
);

watch(
  () => props.visible,
  async (val) => {
    if (val && props.taskData) {
      currentTaskType.value = props.taskData.taskType || 'SHELL';
      currentPreTasks.value = props.preTasks ? [...props.preTasks] : [];
      
      if (!isSqlTask.value && !isRemoteShellTask.value) {
        await taskTypeFormApi.setValues({
          taskType: currentTaskType.value,
        });
      }

      if (isSqlTask.value) {
        sqlFormData.value = {
          name: props.taskData.name || '',
          description: props.taskData.description || '',
          timeoutFlag: props.taskData.timeoutFlag || 'CLOSE',
          timeoutNotifyStrategy: props.taskData.taskParams?.timeoutNotifyStrategy || ['WARN'],
          timeout: props.taskData.timeout || 30,
          type: props.taskData.taskParams?.type || 'MYSQL',
          datasource: props.taskData.taskParams?.datasource,
          sqlType: props.taskData.taskParams?.sqlType || '0',
          displayRows: props.taskData.taskParams?.displayRows || 10,
          sql: props.taskData.taskParams?.sql || '',
          localParams: props.taskData.taskParams?.localParams || [],
          preStatements: props.taskData.taskParams?.preStatements || [],
          postStatements: props.taskData.taskParams?.postStatements || [],
        };
      } else if (isRemoteShellTask.value) {
        remoteShellFormData.value = {
          name: props.taskData.name || '',
          description: props.taskData.description || '',
          timeoutFlag: props.taskData.timeoutFlag || 'CLOSE',
          timeoutNotifyStrategy: props.taskData.taskParams?.timeoutNotifyStrategy || ['WARN'],
          timeout: props.taskData.timeout || 30,
          type: 'SSH',
          datasource: props.taskData.taskParams?.datasource,
          rawScript: props.taskData.taskParams?.rawScript || '',
          localParams: props.taskData.taskParams?.localParams || [],
        };
      } else {
        const formValues: Record<string, any> = {
          name: props.taskData.name || '',
          description: props.taskData.description || '',
          taskPriority: props.taskData.taskPriority || 'MEDIUM',
          workerGroup: props.taskData.workerGroup || 'default',
          failRetryTimes: props.taskData.failRetryTimes || 0,
          failRetryInterval: props.taskData.failRetryInterval || 1,
          timeoutFlag: props.taskData.timeoutFlag === 'OPEN',
          timeout: props.taskData.timeout || 30,
          delayTime: props.taskData.delayTime || 0,
        };

        if (props.taskData.taskParams) {
          Object.keys(props.taskData.taskParams).forEach(key => {
            formValues[`taskParams.${key}`] = props.taskData!.taskParams![key];
          });
        }

        await taskFormApi.setValues(formValues);
      }
    }
  }
);

watch(
  () => taskTypeFormApi.form?.values?.taskType,
  async (newTaskType) => {
    if (newTaskType && newTaskType !== currentTaskType.value) {
      currentTaskType.value = newTaskType;
      
      if (!isSqlTask.value && !isRemoteShellTask.value) {
        const newSchema = getTaskFormSchema(newTaskType);
        taskFormApi.setState({ schema: newSchema });
      }
    }
  }
);

function handlePreTasksUpdate(preTasks: number[]) {
  currentPreTasks.value = preTasks;
}

async function handleOk() {
  let result: Partial<TaskDefinition>;

  if (isSqlTask.value) {
    result = {
      ...props.taskData,
      name: sqlFormData.value.name,
      taskType: 'SQL',
      description: sqlFormData.value.description,
      timeoutFlag: sqlFormData.value.timeoutFlag,
      timeout: sqlFormData.value.timeout,
      taskParams: {
        type: sqlFormData.value.type,
        datasource: sqlFormData.value.datasource,
        sqlType: sqlFormData.value.sqlType,
        displayRows: sqlFormData.value.displayRows,
        sql: sqlFormData.value.sql,
        localParams: sqlFormData.value.localParams,
        preStatements: sqlFormData.value.preStatements,
        postStatements: sqlFormData.value.postStatements,
        timeoutNotifyStrategy: sqlFormData.value.timeoutNotifyStrategy,
      },
    };
  } else if (isRemoteShellTask.value) {
    result = {
      ...props.taskData,
      name: remoteShellFormData.value.name,
      taskType: 'REMOTESHELL',
      description: remoteShellFormData.value.description,
      timeoutFlag: remoteShellFormData.value.timeoutFlag,
      timeout: remoteShellFormData.value.timeout,
      taskParams: {
        type: remoteShellFormData.value.type,
        datasource: remoteShellFormData.value.datasource,
        rawScript: remoteShellFormData.value.rawScript,
        localParams: remoteShellFormData.value.localParams,
        timeoutNotifyStrategy: remoteShellFormData.value.timeoutNotifyStrategy,
      },
    };
  } else {
    const taskTypeValues = await taskTypeFormApi.getValues();
    const taskValues = await taskFormApi.getValues();
    
    const taskParams: Record<string, any> = {};
    Object.keys(taskValues).forEach(key => {
      if (key.startsWith('taskParams.')) {
        const paramKey = key.replace('taskParams.', '');
        taskParams[paramKey] = taskValues[key];
      }
    });

    result = {
      ...props.taskData,
      name: taskValues.name,
      taskType: taskTypeValues.taskType,
      description: taskValues.description,
      taskPriority: taskValues.taskPriority,
      workerGroup: taskValues.workerGroup,
      failRetryTimes: taskValues.failRetryTimes,
      failRetryInterval: taskValues.failRetryInterval,
      timeoutFlag: taskValues.timeoutFlag ? 'OPEN' : 'CLOSE',
      timeout: taskValues.timeout,
      delayTime: taskValues.delayTime,
      taskParams,
    };
  }

  emit('save', result, currentPreTasks.value);
  emit('update:visible', false);
}

function handleCancel() {
  emit('cancel');
  emit('update:visible', false);
}
</script>

<template>
  <Modal
    :open="props.visible"
    :title="taskData?.code ? '编辑任务' : '新建任务'"
    :width="isSqlTask || isRemoteShellTask ? 1000 : 900"
    @cancel="handleCancel"
    @ok="handleOk"
    :confirmLoading="false"
    :maskClosable="false"
  >
    <div class="task-modal-content">
      <Alert
        v-if="props.readonly"
        message="当前为只读模式，无法编辑任务"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />

      <div v-if="!isSqlTask && !isRemoteShellTask" class="form-section">
        <div class="section-title">任务类型</div>
        <TaskTypeForm :disabled="props.readonly" />
      </div>

      <SqlTaskForm
        v-if="isSqlTask"
        v-model:value="sqlFormData"
        :disabled="props.readonly"
        :available-nodes="availableNodes"
        :current-node-code="taskData?.code"
        :pre-tasks="preTasks"
        @update:pre-tasks="handlePreTasksUpdate"
      />

      <RemoteShellTaskForm
        v-else-if="isRemoteShellTask"
        v-model:value="remoteShellFormData"
        :disabled="props.readonly"
        :available-nodes="availableNodes"
        :current-node-code="taskData?.code"
        :pre-tasks="preTasks"
        @update:pre-tasks="handlePreTasksUpdate"
      />

      <div v-else class="form-section">
        <div class="section-title">任务配置</div>
        <TaskForm :disabled="props.readonly" />
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.task-modal-content {
  max-height: 70vh;
  overflow-y: auto;
}

.form-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}
</style>
