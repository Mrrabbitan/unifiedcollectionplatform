<script lang="ts" setup>
import DagEditor from './components/dag/index.vue';
</script>

<template>
  <div class="workflow-page">
    <DagEditor />
  </div>
</template>

<style scoped>
.workflow-page {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>
