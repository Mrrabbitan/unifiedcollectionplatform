import { defineEventHandler, readMultipartFormData } from 'h3';

import mammoth from 'mammoth';

import {
  buildGenericFixture,
  buildPineappleFixture,
  type ParsedDocFixture,
} from '~/utils/aiqa-fixtures';
import { useResponseError, useResponseSuccess } from '~/utils/response';

/** in-memory cache of parsed docs so /ai/chat can re-use them by docId */
const PARSED_CACHE = new Map<string, ParsedDocFixture>();

export function getParsedDoc(docId: string): ParsedDocFixture | undefined {
  return PARSED_CACHE.get(docId);
}

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event);
  const filePart = parts?.find((p) => p.name === 'file' && p.data);
  if (!filePart) {
    return useResponseError('未上传文件');
  }
  const fileName = filePart.filename ?? 'upload.docx';
  const size = filePart.data.byteLength;

  let text = '';
  try {
    const result = await mammoth.extractRawText({ buffer: filePart.data });
    text = (result?.value ?? '').slice(0, 4000);
  } catch (error) {
    console.warn('[aiqa] mammoth parse failed', error);
    text = '';
  }

  const lower = (fileName + ' ' + text).toLowerCase();
  const isPineapple =
    /松果|sftp/.test(lower) ||
    /pineapple/.test(lower) ||
    /(red\s*pine|red\s*pine\s*info|hongsong)/.test(lower) ||
    /北京联通|microgrid|微格大数据/.test(lower);

  const fixture = isPineapple
    ? buildPineappleFixture(fileName, size, text.slice(0, 800))
    : buildGenericFixture(fileName, size, text.slice(0, 800));

  PARSED_CACHE.set(fixture.docId, fixture);

  return useResponseSuccess(fixture);
});
