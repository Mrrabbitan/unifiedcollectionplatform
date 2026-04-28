<script lang="ts" setup>
import { ref, watch, computed } from 'vue';
import {
  Form,
  Input,
  Select,
  Switch,
  Row,
  Col,
  Tag,
  Alert,
  Tooltip,
} from 'ant-design-vue';

interface SFTPSourceConfig {
  path: string;
  file_filter_pattern: string;
  filename_extension: string;
  file_format_type: string;
  field_delimiter: string;
  encoding: string;
  archive_compress_codec: string;
  skip_header_row_number: number;
}

const props = defineProps<{
  modelValue: SFTPSourceConfig;
  sourceFields: string[];
  useTargetFields: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: SFTPSourceConfig): void;
  (e: 'update:sourceFields', value: string[]): void;
  (e: 'update:useTargetFields', value: boolean): void;
}>();

const config = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
});

const sourceFieldInput = ref('');

const fileFormatOptions = [
  { label: 'text', value: 'text' },
  { label: 'csv', value: 'csv' },
  { label: 'json', value: 'json' },
];

const encodingOptions = [
  { label: 'UTF-8', value: 'UTF-8' },
  { label: 'GBK', value: 'GBK' },
  { label: 'GB2312', value: 'GB2312' },
  { label: 'ISO-8859-1', value: 'ISO-8859-1' },
];

const compressOptions = [
  { label: '无压缩', value: 'NONE' },
  { label: '.gz', value: 'GZ' },
  { label: '.tar', value: 'TAR' },
  { label: '.tar.gz', value: 'TAR_GZ' },
  { label: '.zip', value: 'ZIP' },
];

function parseFieldsRealtime() {
  if (!sourceFieldInput.value.trim()) {
    emit('update:sourceFields', []);
    return;
  }

  const inputText = sourceFieldInput.value.trim();
  const fields: string[] = [];

  const lines = inputText.split('\n');
  for (const line of lines) {
    const lineFields = line.split(',').map(f => f.trim()).filter(f => f.length > 0);
    fields.push(...lineFields);
  }

  const uniqueFields = Array.from(new Set(fields));
  emit('update:sourceFields', uniqueFields);
}

watch(sourceFieldInput, () => {
  parseFieldsRealtime();
});

watch(() => props.sourceFields, (newFields) => {
  console.log('[SFTPSourceConfig] props.sourceFields changed:', newFields);
  if (newFields.length > 0 && sourceFieldInput.value === '') {
    sourceFieldInput.value = newFields.join('\n');
  }
}, { immediate: true });

defineExpose({
  config,
});
</script>

<template>
  <div class="sftp-source-config">
    <div class="group-header">
      <span class="group-title">路径与匹配</span>
    </div>
    <Form layout="horizontal">
      <Row :gutter="20">
        <Col :span="12">
          <Form.Item label="源端路径" required>
            <Input
              v-model:value="config.path"
              placeholder="请输入源端路径，如 /data/files/"
            />
          </Form.Item>
        </Col>
        <Col :span="12">
          <Form.Item label="文件匹配格式">
            <Input
              v-model:value="config.file_filter_pattern"
              placeholder="请输入文件匹配正则表达式"
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>

    <div class="group-header">
      <span class="group-title">文件格式</span>
    </div>
    <Form layout="horizontal">
      <Row :gutter="20">
        <Col :span="8">
          <Form.Item label="文件扩展名">
            <Input
              v-model:value="config.filename_extension"
              placeholder="如 .txt、.csv、.gz"
            />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="文件类型">
            <Select
              v-model:value="config.file_format_type"
              :options="fileFormatOptions"
              placeholder="请选择文件类型"
            />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="字段分隔符">
            <Input
              v-model:value="config.field_delimiter"
              placeholder="如 , 或 \t"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row :gutter="20">
        <Col :span="8">
          <Form.Item label="编码格式">
            <Select
              v-model:value="config.encoding"
              :options="encodingOptions"
              placeholder="请选择编码格式"
            />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="压缩格式">
            <Select
              v-model:value="config.archive_compress_codec"
              :options="compressOptions"
              placeholder="请选择压缩格式"
            />
          </Form.Item>
        </Col>
        <Col :span="8">
          <Form.Item label="跳过前几行">
            <Input
              v-model:value="config.skip_header_row_number"
              type="number"
              placeholder="跳过的行数"
              style="width: 100%"
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>

    <div class="group-header">
      <span class="group-title">字段信息</span>
    </div>
    <Form layout="horizontal">
      <Form.Item>
        <div style="display: flex; align-items: center; gap: 8px;">
          <Switch 
            :checked="useTargetFields"
            @update:checked="(val: boolean) => emit('update:useTargetFields', val)"
          />
          <span>使用目标端的字段</span>
          <Tooltip title="开启后，源端字段将使用目标端表的字段，无需手动输入">
            <span style="color: #999; cursor: help;">?</span>
          </Tooltip>
        </div>
      </Form.Item>
      <Form.Item v-if="!useTargetFields" label="字段列表" extra="支持多行输入，字段以逗号分隔，无需引号">
        <Input.TextArea
          v-model:value="sourceFieldInput"
          placeholder="请输入字段名称，多个字段以逗号分隔&#10;例如：&#10;id, name, age, email&#10;address, phone, create_time"
          :rows="4"
        />
      </Form.Item>
      <div v-if="!useTargetFields && sourceFields.length > 0" class="parsed-fields">
        <span class="fields-label">已解析字段：</span>
        <div class="fields-tags">
          <Tag v-for="field in sourceFields" :key="field" color="blue">{{ field }}</Tag>
        </div>
      </div>
      <Alert v-if="useTargetFields" type="info" message="已开启使用目标端字段，请在第二步选择目标端表后，第三步将自动使用目标端字段作为源端字段" show-icon />
    </Form>
  </div>
</template>

<style scoped>
.sftp-source-config {
  padding: 0;
}

.group-header {
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
}

.group-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.parsed-fields {
  margin-top: 12px;
  padding: 12px;
  background: #fafafa;
  border-radius: 4px;
}

.fields-label {
  display: block;
  margin-bottom: 8px;
  color: #666;
}

.fields-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
