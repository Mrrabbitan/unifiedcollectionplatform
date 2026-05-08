import type {
  ActionItem,
  AiStreamEvent,
  AttachmentMeta,
  ChatMessage,
  PickedSourceTarget,
} from '../types';

import { reactive, ref } from 'vue';

import { openChatStream } from '#/api/aiqa';

interface SendOptions {
  source: PickedSourceTarget['source'];
  target: PickedSourceTarget['target'];
  attachment?: AttachmentMeta;
  text?: string;
  resumeContext?: {
    questionId: string;
    answers: Record<string, string>;
  };
}

interface UseAiChatHooks {
  onAction?: (msg: ChatMessage, action: ActionItem) => Promise<void> | void;
}

function nextId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useAiChat(hooks: UseAiChatHooks = {}) {
  const messages = ref<ChatMessage[]>([]);
  const conversationId = ref<string | undefined>(undefined);
  const sending = ref(false);
  let abortCtrl: AbortController | undefined;

  function pushUserMessage(text: string, attachment?: AttachmentMeta) {
    // Wrap with reactive() so subsequent mutations through the returned
    // reference still trigger Vue updates. Pushing a raw object into the
    // ref array would only re-create the array; later property writes on
    // the local variable would bypass the Proxy and never re-render.
    const msg = reactive<ChatMessage>({
      id: nextId('u'),
      role: 'user',
      content: text,
      attachment,
    });
    messages.value.push(msg);
    return msg;
  }

  function startAssistantMessage(): ChatMessage {
    const msg = reactive<ChatMessage>({
      id: nextId('a'),
      role: 'assistant',
      content: '',
      thinking: '',
      thinkingDone: false,
      actions: [],
      loading: true,
    });
    messages.value.push(msg);
    return msg;
  }

  function findActiveAssistant(): ChatMessage | undefined {
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const m = messages.value[i]!;
      if (m.role === 'assistant') return m;
    }
    return undefined;
  }

  async function consumeStream(resp: Response, target: ChatMessage) {
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    function dispatch(rawLine: string) {
      const line = rawLine.replace(/^data:\s?/, '').trim();
      if (!line || line === '[DONE]') return;
      let event: AiStreamEvent | null = null;
      try {
        event = JSON.parse(line) as AiStreamEvent;
      } catch {
        return;
      }
      if (!event) return;
      switch (event.type) {
        case 'meta': {
          conversationId.value = event.conversationId;
          break;
        }
        case 'thinking': {
          target.thinking = (target.thinking ?? '') + event.text;
          break;
        }
        case 'answer': {
          if (target.thinking && !target.thinkingDone) {
            target.thinkingDone = true;
          }
          target.content += event.delta;
          break;
        }
        case 'question': {
          target.thinkingDone = true;
          target.question = event.question;
          target.questionResolved = false;
          break;
        }
        case 'action': {
          if (!target.actions) target.actions = [];
          const existing = target.actions.find(
            (a) => a.id === event.action.id,
          );
          if (existing) {
            Object.assign(existing, event.action);
          } else {
            target.actions.push(event.action);
          }
          if (event.action.status === 'pending' && hooks.onAction) {
            void hooks.onAction(target, event.action);
          }
          break;
        }
        case 'done': {
          target.loading = false;
          break;
        }
        case 'error': {
          target.errored = true;
          target.loading = false;
          target.content +=
            (target.content ? '\n\n' : '') + `⚠️ ${event.message}`;
          break;
        }
      }
    }

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx = buffer.indexOf('\n');
        while (idx >= 0) {
          const line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.length > 0) dispatch(line);
          idx = buffer.indexOf('\n');
        }
      }
      if (buffer.length > 0) dispatch(buffer);
    } catch (error) {
      if ((error as DOMException)?.name !== 'AbortError') {
        target.errored = true;
        target.content +=
          (target.content ? '\n\n' : '') +
          `⚠️ 流式响应异常：${(error as Error).message}`;
      }
    } finally {
      target.loading = false;
      target.thinkingDone = true;
    }
  }

  async function send(options: SendOptions) {
    if (sending.value) return;
    sending.value = true;
    abortCtrl = new AbortController();

    if (!options.resumeContext) {
      pushUserMessage(options.text ?? '', options.attachment);
    }

    const assistant = startAssistantMessage();

    try {
      const resp = await openChatStream(
        {
          conversationId: conversationId.value,
          source: {
            id: options.source.datasource.id,
            name: options.source.datasource.name,
            type: options.source.type,
          },
          target: {
            id: options.target.datasource.id,
            name: options.target.datasource.name,
            type: options.target.type,
          },
          attachment: options.attachment
            ? {
                docId: options.attachment.docId,
                fileName: options.attachment.fileName,
              }
            : undefined,
          userMessage: options.text,
          resumeContext: options.resumeContext,
        },
        abortCtrl.signal,
      );
      await consumeStream(resp, assistant);
    } catch (error) {
      assistant.errored = true;
      assistant.loading = false;
      assistant.content =
        (assistant.content || '') +
        `⚠️ 请求失败：${(error as Error).message}`;
    } finally {
      sending.value = false;
      abortCtrl = undefined;
    }
  }

  function stop() {
    abortCtrl?.abort();
    sending.value = false;
  }

  function reset() {
    stop();
    messages.value = [];
    conversationId.value = undefined;
  }

  function answerQuestion(
    msgId: string,
    answers: Record<string, string>,
    options: SendOptions,
  ) {
    const msg = messages.value.find((m) => m.id === msgId);
    if (!msg?.question) return;
    const questionId = msg.question.id;
    msg.questionResolved = true;
    return send({
      ...options,
      resumeContext: { questionId, answers },
    });
  }

  return {
    messages,
    sending,
    conversationId,
    send,
    stop,
    reset,
    answerQuestion,
    findActiveAssistant,
  };
}
