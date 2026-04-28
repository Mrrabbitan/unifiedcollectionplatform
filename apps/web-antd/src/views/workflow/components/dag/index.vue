<script lang="ts" setup>
import { computed, onMounted, provide, ref } from 'vue';

import type { Graph, Node } from '@antv/x6';

import { message } from 'ant-design-vue';

import { getProjectPreference, type ProjectPreference } from '#/api/project';
import { getTaskCodeList } from '#/api/taskmanagement';
import { useProjectStore } from '@vben/stores';

import DagSidebar from './DagSidebar.vue';
import DagCanvas from './DagCanvas.vue';
import DagToolbar from './DagToolbar.vue';
import DagSaveModal from './DagSaveModal.vue';
import DagTaskModal from './DagTaskModal.vue';
import { useCanvasInit, useCustomCellBuilder, useDagDragAndDrop } from './hooks';
import type { TaskDefinition, TaskType, Coordinate, SaveForm, Location, Connect } from './types';

const graph = ref<Graph>();
const readonly = ref(false);
const paper = ref<HTMLElement>();

provide('graph', graph);
provide('readonly', readonly);

const projectStore = useProjectStore();
const { buildNode, buildEdge } = useCustomCellBuilder();

const workflowName = ref('');
const saveModalVisible = ref(false);
const taskModalVisible = ref(false);
const currentTask = ref<Partial<TaskDefinition>>({});

const taskDefinitionList = ref<TaskDefinition[]>([]);
const connectList = ref<Connect[]>([]);

const projectPreference = ref<ProjectPreference>();

const availableNodes = computed(() => {
  return taskDefinitionList.value.map((task) => ({
    code: task.code,
    name: task.name,
  }));
});

const currentPreTasks = computed(() => {
  if (!currentTask.value?.code) return [];
  return connectList.value
    .filter((c) => c.postTaskCode === currentTask.value!.code)
    .map((c) => c.preTaskCode);
});

async function fetchProjectPreference() {
  const projectCode = projectStore.currentProject?.code;
  if (!projectCode) return;
  
  try {
    const res = await getProjectPreference(projectCode);
    projectPreference.value = typeof res.preferences === 'string' 
        ? JSON.parse(res.preferences) 
        : res.preferences;
  } catch (error) {
    console.error('Failed to fetch project preference:', error);
  }
}

async function generateTaskCode(): Promise<number> {
  try {
    const codes = await getTaskCodeList();
    return codes?.[0] || Date.now();
  } catch (error) {
    console.error('Failed to generate task code:', error);
    return Date.now();
  }
}

async function appendTask(code: number, type: TaskType, coordinate: Coordinate) {
  const nodeData = buildNode(String(code), type, `任务_${code}`, coordinate);
  graph.value?.addNode(nodeData);

  const defaultWorkerGroup = projectPreference.value?.workerGroup || 'default';
  const defaultEnvironmentCode = projectPreference.value?.environmentCode || 0;

  taskDefinitionList.value.push({
    id: 0,
    code,
    name: `任务_${code}`,
    version: 1,
    description: '',
    projectCode: projectStore.currentProject?.code || 0,
    userId: 0,
    taskType: type,
    taskParams: {},
    flag: 'YES',
    taskPriority: projectPreference.value?.taskPriority || 'MEDIUM',
    workerGroup: defaultWorkerGroup,
    environmentCode: defaultEnvironmentCode,
    failRetryTimes: projectPreference.value?.failRetryTimes || 0,
    failRetryInterval: projectPreference.value?.failRetryInterval || 1,
    timeoutFlag: 'CLOSE',
    timeout: 0,
    delayTime: 0,
    resourceIds: '',
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString(),
  });
}

const { onDragStart, onDrop } = useDagDragAndDrop({
  readonly,
  graph,
  appendTask,
  generateTaskCode,
});

function handleNodeClick(node: Node) {
  const task = taskDefinitionList.value.find((t) => String(t.code) === node.id);
  if (task) {
    currentTask.value = { ...task };
    taskModalVisible.value = true;
  }
}

function handleEdgeConnected(sourceId: string, targetId: string) {
  const exists = connectList.value.some(
    (c) => String(c.preTaskCode) === sourceId && String(c.postTaskCode) === targetId
  );
  if (!exists) {
    connectList.value.push({
      name: '',
      preTaskCode: Number(sourceId),
      postTaskCode: Number(targetId),
      conditionType: 'NONE',
      conditionParams: {},
    });
  }
}

const { initGraph, destroyGraph } = useCanvasInit({
  readonly,
  graph,
  paper,
  onNodeClick: handleNodeClick,
  onEdgeConnected: handleEdgeConnected,
  onDeleteSelected: handleDelete,
});

function handleCanvasMounted(paperEl: HTMLElement) {
  paper.value = paperEl;
  initGraph();
}

function handleSave(form: SaveForm) {
  const nodes = graph.value?.getNodes() || [];
  const edges = graph.value?.getEdges() || [];

  if (nodes.length === 0) {
    message.warning('请先添加任务节点');
    return;
  }

  const locations: Location[] = nodes.map((node) => ({
    taskCode: Number(node.id),
    x: node.position().x,
    y: node.position().y,
  }));

  const connects: Connect[] = edges.map((edge) => {
    const sourceId = edge.getSourceCellId();
    const targetId = edge.getTargetCellId();
    return {
      name: '',
      preTaskCode: Number(sourceId),
      postTaskCode: Number(targetId),
      conditionType: 'NONE',
      conditionParams: {},
    };
  });

  workflowName.value = form.name;

  console.log('保存工作流:', {
    name: form.name,
    description: form.description,
    taskDefinitionList: taskDefinitionList.value,
    connects,
    locations,
    globalParams: form.globalParams,
  });

  message.success('保存成功');
}

function handleTaskSave(task: Partial<TaskDefinition>, preTasks: number[]) {
  const index = taskDefinitionList.value.findIndex((t) => t.code === task.code);
  if (index !== -1) {
    taskDefinitionList.value[index] = {
      ...taskDefinitionList.value[index],
      ...task,
    } as TaskDefinition;

    const node = graph.value?.getCellById(String(task.code));
    if (node && node.isNode()) {
      node.setData({
        taskName: task.name,
        taskType: task.taskType,
      });
      const truncation = task.name && task.name.length > 15
        ? task.name.substring(0, 15) + '...'
        : task.name || String(task.code);
      node.setAttrs({
        title: {
          text: truncation,
        },
      });
    }

    updatePreTaskConnections(task.code!, preTasks);
  }
  taskModalVisible.value = false;
}

function updatePreTaskConnections(nodeCode: number, preTasks: number[]) {
  connectList.value = connectList.value.filter((c) => c.postTaskCode !== nodeCode);

  const existingEdges = graph.value?.getEdges() || [];
  existingEdges.forEach((edge) => {
    const targetId = edge.getTargetCellId();
    if (targetId === String(nodeCode)) {
      graph.value?.removeEdge(edge);
    }
  });

  preTasks.forEach((preTaskCode) => {
    connectList.value.push({
      name: '',
      preTaskCode,
      postTaskCode: nodeCode,
      conditionType: 'NONE',
      conditionParams: {},
    });

    const edgeData = buildEdge(String(preTaskCode), String(nodeCode));
    graph.value?.addEdge(edgeData);
  });
}

function handleDelete() {
  if (!graph.value) return;
  
  const selectedCells = (graph.value as any).getSelectedCells?.() || [];
  if (selectedCells.length === 0) return;
  
  const selectedNodes = selectedCells.filter((cell: any) => cell.isNode());
  const selectedEdges = selectedCells.filter((cell: any) => cell.isEdge());
  
  selectedNodes.forEach((node: any) => {
    const code = Number(node.id);
    
    const connectedEdges = graph.value?.getConnectedEdges(node) || [];
    connectedEdges.forEach((edge) => {
      graph.value?.removeEdge(edge);
      const sourceId = edge.getSourceCellId();
      const targetId = edge.getTargetCellId();
      connectList.value = connectList.value.filter(
        (c) => !(String(c.preTaskCode) === sourceId && String(c.postTaskCode) === targetId)
      );
    });
    
    graph.value?.removeNode(node);
    taskDefinitionList.value = taskDefinitionList.value.filter((t) => t.code !== code);
    connectList.value = connectList.value.filter(
      (c) => c.preTaskCode !== code && c.postTaskCode !== code
    );
  });
  
  selectedEdges.forEach((edge: any) => {
    graph.value?.removeEdge(edge);
    const sourceId = edge.getSourceCellId();
    const targetId = edge.getTargetCellId();
    connectList.value = connectList.value.filter(
      (c) => !(String(c.preTaskCode) === sourceId && String(c.postTaskCode) === targetId)
    );
  });
}

function handleClose() {
  destroyGraph();
  taskDefinitionList.value = [];
  connectList.value = [];
  workflowName.value = '';
}

function handleFormat() {
  if (graph.value) {
    graph.value.zoomToFit({ padding: 50 });
  }
}

onMounted(() => {
  fetchProjectPreference();
});
</script>

<template>
  <div class="workflow-dag">
    <DagToolbar
      :workflow-name="workflowName"
      :readonly="readonly"
      @save="saveModalVisible = true"
      @close="handleClose"
      @format="handleFormat"
      @delete="handleDelete"
    />

    <div class="dag-content">
      <DagSidebar @drag-start="onDragStart" />
      <DagCanvas @drop="onDrop" @mounted="handleCanvasMounted" />
    </div>

    <DagSaveModal
      v-model:visible="saveModalVisible"
      :workflow-name="workflowName"
      @save="handleSave"
    />

    <DagTaskModal
      v-model:visible="taskModalVisible"
      :task-data="currentTask"
      :readonly="false"
      :available-nodes="availableNodes"
      :pre-tasks="currentPreTasks"
      @save="handleTaskSave"
    />
  </div>
</template>

<style scoped>
.workflow-dag {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
}

.dag-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}
</style>
