import type { ChatCompletionMessage } from "@/services/ai/llmClient";

export type AssistantReplyOrigin = "api" | "template";

export interface AssistantRequestTraceEntry {
  payloadHash: string;
  origin: AssistantReplyOrigin;
  at: string;
}

const MAX_TRACE_ENTRIES = 3;
const traceRing: AssistantRequestTraceEntry[] = [];

function isDevEnvironment(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

/** Stable short hash for dev logging (not cryptographic). */
export function hashChatPayload(messages: ChatCompletionMessage[]): string {
  const normalized = messages.map((message) => ({
    role: message.role,
    content: message.content.slice(0, 240),
  }));
  const payload = JSON.stringify(normalized);
  let hash = 5381;
  for (let i = 0; i < payload.length; i += 1) {
    hash = (hash * 33) ^ payload.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function recordAssistantRequest(
  messages: ChatCompletionMessage[],
  origin: AssistantReplyOrigin
): void {
  const entry: AssistantRequestTraceEntry = {
    payloadHash: hashChatPayload(messages),
    origin,
    at: new Date().toISOString(),
  };

  traceRing.unshift(entry);
  if (traceRing.length > MAX_TRACE_ENTRIES) {
    traceRing.length = MAX_TRACE_ENTRIES;
  }

  if (isDevEnvironment()) {
    console.info("[assistant-trace]", {
      origin,
      payloadHash: entry.payloadHash,
      messageCount: messages.length,
      recent: getAssistantRequestTrace(),
    });
  }
}

export function getAssistantRequestTrace(): readonly AssistantRequestTraceEntry[] {
  return traceRing;
}

export function clearAssistantRequestTrace(): void {
  traceRing.length = 0;
}
