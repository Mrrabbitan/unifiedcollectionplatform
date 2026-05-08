<script lang="ts" setup>
import type { PickedSourceTarget } from './types';

import { nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Empty } from 'ant-design-vue';

import ChatPage from './components/chat-page.vue';
import SourceTargetPickerModal from './components/source-target-picker-modal.vue';

defineOptions({ name: 'AiqaIndex' });

const router = useRouter();
const picked = ref<PickedSourceTarget | null>(null);
const pickerRef = ref<InstanceType<typeof SourceTargetPickerModal> | null>(
  null,
);

onMounted(async () => {
  await nextTick();
  pickerRef.value?.open();
});

function onConfirm(value: PickedSourceTarget) {
  picked.value = value;
}

function onCancel() {
  if (!picked.value) {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  }
}

function onSwitch() {
  pickerRef.value?.open();
}
</script>

<template>
  <Page :auto-content-height="true" content-class="aiqa-page-content">
    <SourceTargetPickerModal
      ref="pickerRef"
      :initial="picked"
      @confirm="onConfirm"
      @cancel="onCancel"
    />
    <ChatPage v-if="picked" :picked="picked" @switch-source="onSwitch" />
    <div v-else class="aiqa-loading">
      <Empty :image="Empty.PRESENTED_IMAGE_SIMPLE" description="请先选择数据源以开始对话" />
    </div>
  </Page>
</template>

<style scoped>
.aiqa-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 96px);
}

:deep(.aiqa-page-content) {
  padding: 0;
}
</style>
