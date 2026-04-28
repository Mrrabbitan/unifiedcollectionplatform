<script lang="ts" setup>
import { Page } from '@vben/common-ui';

import { Card, Result } from 'ant-design-vue';

defineOptions({ name: 'UnstructuredStreamTask' });
</script>

<template>
  <Page
    title="实时采集"
    description="创建实时采集数据任务"
  >
    <Card>
      <Result
        status="info"
        title="实时采集"
        sub-title="此功能正在开发中，敬请期待..."
      />
    </Card>
  </Page>
</template>
