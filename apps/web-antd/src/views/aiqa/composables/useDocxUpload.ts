import type { AttachmentMeta } from '../types';

import { ref } from 'vue';

import { message } from 'ant-design-vue';

import { parseDocxApi } from '#/api/aiqa';

const ACCEPTED = /\.docx?$/i;

export function useDocxUpload() {
  const uploading = ref(false);
  const attachment = ref<AttachmentMeta | undefined>(undefined);

  async function pickAndUpload(file: File) {
    if (!ACCEPTED.test(file.name)) {
      message.warning('仅支持 .docx 格式文件');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      message.warning('文件不能超过 20MB');
      return;
    }
    uploading.value = true;
    try {
      const resp = await parseDocxApi(file);
      attachment.value = {
        docId: resp.docId,
        fileName: resp.fileName ?? file.name,
        size: resp.size ?? file.size,
        summary: resp.summary,
        detected: resp.detected,
      };
      message.success('文档解析完成，可以发送提问了');
    } catch (error) {
      console.error('[aiqa] docx parse failed', error);
      const detail =
        (error as any)?.response?.data?.message ||
        (error as Error)?.message ||
        String(error);
      message.error(`文档解析失败：${detail}`);
    } finally {
      uploading.value = false;
    }
  }

  function clear() {
    attachment.value = undefined;
  }

  return { uploading, attachment, pickAndUpload, clear };
}
