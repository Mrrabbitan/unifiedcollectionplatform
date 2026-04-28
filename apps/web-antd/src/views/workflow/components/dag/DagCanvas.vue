<script lang="ts" setup>
import { ref, inject, onMounted, onUnmounted } from 'vue';

import type { Graph } from '@antv/x6';

const graph = inject<ReturnType<typeof ref<Graph | undefined>>>('graph', ref());
const readonly = inject<ReturnType<typeof ref<boolean>>>('readonly', ref(false));

const paper = ref<HTMLElement>();
const minimap = ref<HTMLElement>();
const container = ref<HTMLElement>();

const emit = defineEmits<{
  drop: [e: DragEvent];
  mounted: [paper: HTMLElement];
}>();

function preventDefault(e: DragEvent) {
  e.preventDefault();
}

function handleDrop(e: DragEvent) {
  emit('drop', e);
}

function handleResize() {
  if (container.value && graph.value) {
    const w = container.value.offsetWidth;
    const h = container.value.offsetHeight;
    graph.value.resize(w, h);
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize);
  if (paper.value) {
    emit('mounted', paper.value);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
});

defineExpose({
  paper,
  minimap,
  container,
});
</script>

<template>
  <div
    ref="container"
    class="dag-canvas"
    @drop="handleDrop"
    @dragenter="preventDefault"
    @dragover="preventDefault"
    @dragleave="preventDefault"
  >
    <div ref="paper" class="paper"></div>
    <div ref="minimap" class="minimap"></div>
  </div>
</template>

<style scoped>
.dag-canvas {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #f5f7fa;
}

.paper {
  width: 100%;
  height: 100%;
}

.minimap {
  position: absolute;
  right: 10px;
  bottom: 10px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}
</style>
