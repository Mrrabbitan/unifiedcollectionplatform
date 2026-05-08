import type { ParsedDocSummary } from '#/views/aiqa/types';

import { useAppConfig } from '@vben/hooks';

import { requestClient } from '#/api/request';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

export interface ParseDocxResp {
  docId: string;
  fileName: string;
  size: number;
  title: string;
  summary: string;
  detected: ParsedDocSummary;
}

export async function parseDocxApi(file: File) {
  // 走内置的 upload 方法：内部会构造 FormData 并把 Content-Type
  // 设为 multipart/form-data；浏览器会替我们补上 boundary。
  return requestClient.upload<ParseDocxResp>('/ai/parse-docx', { file });
}

/**
 * Open a streaming chat call. Caller iterates over the returned ReadableStream
 * to consume newline-delimited JSON events. Using fetch directly because the
 * shared RequestClient is built around JSON responses.
 */
export async function openChatStream(
  body: Record<string, any>,
  signal?: AbortSignal,
): Promise<Response> {
  const apiEnv =
    typeof localStorage !== 'undefined' &&
    localStorage.getItem('app:apiEnv') === 'prod'
      ? 'prod'
      : 'mock';
  const baseURL = apiEnv === 'prod' ? '/__prod_api/api' : apiURL;
  const resp = await fetch(`${baseURL}/ai/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'X-Api-Env': apiEnv,
    },
    credentials: 'include',
    body: JSON.stringify(body),
    signal,
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`AI chat stream failed: HTTP ${resp.status}`);
  }
  return resp;
}
