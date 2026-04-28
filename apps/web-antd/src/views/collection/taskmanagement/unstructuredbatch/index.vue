<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { Card, Result } from 'ant-design-vue';

defineOptions({ name: 'UnstructuredBatchTask' });
</script>

<template>
  <Page
    title="批量采集 - 非结构化数据"
    description="创建批量采集非结构化数据任务"
  >
    <Card>
      <Result
        status="info"
        title="批量采集 - 非结构化数据"
        sub-title="此功能正在开发中，敬请期待..."
      />
    </Card>
  </Page>
</template>
