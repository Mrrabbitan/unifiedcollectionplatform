<script lang="ts" setup>
import { inject, ref } from 'vue';

import { Button, Input, Tooltip, Space, Popconfirm } from 'ant-design-vue';
import {
  Download,
  LayoutGrid,
  Maximize,
  Minimize,
  Search,
  Trash,
  X,
  ZoomIn,
  ZoomOut,
} from '@vben/icons';

import type { Graph } from '@antv/x6';

const props = defineProps<{
  workflowName?: string;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  save: [];
  close: [];
  format: [];
  delete: [];
  download: [];
}>();

const graph = inject<ReturnType<typeof ref<Graph | undefined>>>('graph', ref());

const isFullscreen = ref(false);

const searchValue = ref<string>('');

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
    isFullscreen.value = true;
  } else {
    document.exitFullscreen();
    isFullscreen.value = false;
  }
}

function handleZoomIn() {
  if (graph.value) {
    const zoom = graph.value.zoom();
    graph.value.zoom(zoom * 1.2);
  }
}

function handleZoomOut() {
  if (graph.value) {
    const zoom = graph.value.zoom();
    graph.value.zoom(zoom / 1.2);
  }
}

function handleFitView() {
  if (graph.value) {
    graph.value.zoomToFit({ padding: 50 });
  }
}

function handleDownload() {
  if (graph.value) {
    (graph.value as any).toPNG((dataUri: string) => {
      const link = document.createElement('a');
      link.download = `${props.workflowName || 'workflow'}.png`;
      link.href = dataUri;
      link.click();
    }, {
      padding: 50,
      backgroundColor: '#f5f7fa',
    });
  }
}

function handleDelete() {
  emit('delete');
}

function handleSearch(value: string) {
  if (graph.value && value) {
    const nodes = graph.value.getNodes();
    const found = nodes.find((n) => {
      const data = n.getData();
      return data?.taskName?.toLowerCase().includes(value.toLowerCase());
    });
    if (found) {
      graph.value.centerCell(found);
    }
  }
}
</script>

<template>
  <div class="dag-toolbar">
    <div class="toolbar-left">
      <span class="workflow-name">{{ workflowName || '新建工作流' }}</span>
    </div>

    <div class="toolbar-center">
      <Space>
        <Tooltip title="放大">
          <Button type="text" @click="handleZoomIn">
            <template #icon>
              <ZoomIn class="size-4" />
            </template>
          </Button>
        </Tooltip>
        <Tooltip title="缩小">
          <Button type="text" @click="handleZoomOut">
            <template #icon>
              <ZoomOut class="size-4" />
            </template>
          </Button>
        </Tooltip>
        <Tooltip title="适应画布">
          <Button type="text" @click="handleFitView">
            <template #icon>
              <LayoutGrid class="size-4" />
            </template>
          </Button>
        </Tooltip>
      </Space>
    </div>

    <div class="toolbar-right">
      <Space>
        <Input.Search
          v-model:value="searchValue"
          placeholder="搜索节点"
          style="width: 150px"
          @search="handleSearch"
        >
          <template #prefix>
            <Search class="size-3.5" />
          </template>
        </Input.Search>

        <Tooltip title="下载图片">
          <Button type="text" @click="handleDownload">
            <template #icon>
              <Download class="size-4" />
            </template>
          </Button>
        </Tooltip>

        <Popconfirm
          title="确定删除选中的节点或连线吗？"
          @confirm="handleDelete"
        >
          <Tooltip title="删除">
            <Button type="text">
              <template #icon>
                <Trash class="size-4" />
              </template>
            </Button>
          </Tooltip>
        </Popconfirm>

        <Tooltip :title="isFullscreen ? '退出全屏' : '全屏'">
          <Button type="text" @click="toggleFullscreen">
            <template #icon>
              <Minimize v-if="isFullscreen" class="size-4" />
              <Maximize v-else class="size-4" />
            </template>
          </Button>
        </Tooltip>

        <Button type="primary" @click="emit('save')" :disabled="readonly">
          保存
        </Button>

        <Button @click="emit('close')">
          <template #icon>
            <X class="size-4" />
          </template>
          关闭
        </Button>
      </Space>
    </div>
  </div>
</template>

<style scoped>
.dag-toolbar {
  height: 48px;
  background: #fff;
  border-bottom: 1px solid #e8e8e8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
}

.workflow-name {
  font-size: 15px;
  font-weight: 600;
  color: #333;
}

.toolbar-center {
  display: flex;
  align-items: center;
}

.toolbar-right {
  display: flex;
  align-items: center;
}
</style>
