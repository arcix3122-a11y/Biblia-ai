import { decryptKeyIfNeeded } from "../security/keyObfuscator";

export type LlmProvider = "groq" | "openai";

export interface LlmApiConfig {
  provider: LlmProvider;
  apiKey: string;
  endpoint: string;
  model: string;
  fallbackModel: string;
}

/** Config without a bound key — the failover engine supplies keys per attempt. */
export interface LlmBaseConfig {
  provider: LlmProvider;
  endpoint: string;
  model: string;
  fallbackModel: string;
}

const PROVIDER_DEFAULTS: Record<LlmProvider, { endpoint: string; model: string; fallbackModel: string }> = {
  groq: {
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    fallbackModel: "llama-3.1-8b-instant",
  },
  openai: {
    endpoint: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
    fallbackModel: "gpt-4o-mini",
  },
};

export interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionRequestOptions {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  /** Per-request seed to reduce identical completions across turns. */
  seed?: number;
}

export interface LlmDebugInfo {
  provider: LlmProvider;
  endpoint: string;
  model: string;
  statusCode: number | null;
  latencyMs: number;
  errorMessage: string | null;
  usedFallbackModel: boolean;
  at: string;
}

let lastLlmDebugInfo: LlmDebugInfo | null = null;

export function getLastLlmDebugInfo(): LlmDebugInfo | null {
  return lastLlmDebugInfo;
}

function isDevEnvironment(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

function logLlmDebug(info: LlmDebugInfo): void {
  lastLlmDebugInfo = info;
  if (isDevEnvironment()) {
    console.info("[llm]", {
      provider: info.provider,
      model: info.model,
      statusCode: info.statusCode,
      latencyMs: info.latencyMs,
      usedFallbackModel: info.usedFallbackModel,
      errorMessage: info.errorMessage,
    });
  }
}

interface ChatCompletionChoice {
  message?: {
    content?: string;
  };
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
  error?: {
    message?: string;
  };
}

/** HTTP-level LLM error carrying the status so the failover engine can react. */
export class LlmHttpError extends Error {
  status: number;
  retryAfterMs?: number;
  constructor(status: number, message: string, retryAfterMs?: number) {
    super(message);
    this.name = "LlmHttpError";
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

const PLACEHOLDER_KEY = "your-openai-or-groq-key";

function isUsableKey(key: string): boolean {
  return key.length > 0 && key !== PLACEHOLDER_KEY && !key.startsWith("your-");
}

/**
 * All configured API keys, in priority order. Reads EXPO_PUBLIC_AI_API_KEY plus
 * numbered fallbacks (EXPO_PUBLIC_AI_API_KEY_2, _3); each var may itself be a
 * comma-separated list. Placeholders and duplicates are dropped.
 */
export function getLlmApiKeys(): string[] {
  const sources = [
    process.env.EXPO_PUBLIC_AI_API_KEY,
    process.env.EXPO_PUBLIC_AI_API_KEY_2,
    process.env.EXPO_PUBLIC_AI_API_KEY_3,
  ];
  const keys: string[] = [];
  for (const source of sources) {
    if (!source) continue;
    for (const part of source.split(",")) {
      const rawKey = part.trim();
      if (!rawKey) continue;
      const key = decryptKeyIfNeeded(rawKey);
      if (isUsableKey(key) && !keys.includes(key)) {
        keys.push(key);
      }
    }
  }
  return keys;
}

export function getLlmApiKey(): string {
  return getLlmApiKeys()[0] ?? "";
}

export function hasLlmApiKey(): boolean {
  return getLlmApiKeys().length > 0;
}

export function resolveLlmProvider(): LlmProvider {
  const rawProvider = process.env.EXPO_PUBLIC_AI_PROVIDER?.trim().toLowerCase();
  if (rawProvider === "openai") {
    return "openai";
  }
  if (rawProvider === "groq") {
    return "groq";
  }

  const apiKey = getLlmApiKey();
  if (apiKey.startsWith("gsk_")) {
    return "groq";
  }

  const endpointHint =
    process.env.EXPO_PUBLIC_AI_API_URL?.toLowerCase() ||
    process.env.EXPO_PUBLIC_OPENAI_API_URL?.toLowerCase() ||
    "";
  return endpointHint.includes("groq.com") ? "groq" : "openai";
}

export function buildLlmBaseConfig(): LlmBaseConfig {
  const provider = resolveLlmProvider();
  const defaults = PROVIDER_DEFAULTS[provider];
  return {
    provider,
    endpoint:
      process.env.EXPO_PUBLIC_AI_API_URL?.trim() ||
      process.env.EXPO_PUBLIC_OPENAI_API_URL?.trim() ||
      defaults.endpoint,
    model:
      process.env.EXPO_PUBLIC_AI_MODEL?.trim() ||
      process.env.EXPO_PUBLIC_OPENAI_MODEL?.trim() ||
      defaults.model,
    fallbackModel: defaults.fallbackModel,
  };
}

export function buildLlmApiConfig(): LlmApiConfig {
  const keys = getLlmApiKeys();
  if (keys.length === 0) {
    throw new Error("Missing EXPO_PUBLIC_AI_API_KEY");
  }
  return { ...buildLlmBaseConfig(), apiKey: keys[0] };
}

// ---------------------------------------------------------------------------
// Per-key failover state
// ---------------------------------------------------------------------------
const keyCooldownUntil = new Map<string, number>();
const RATE_LIMIT_COOLDOWN_MS = 60_000; // overloaded / rate-limited key rests 1 min
const AUTH_COOLDOWN_MS = 10 * 60_000; // bad/expired key rests 10 min

function isKeyCooling(key: string): boolean {
  const until = keyCooldownUntil.get(key);
  return until !== undefined && until > Date.now();
}

function coolKey(key: string, ms: number): void {
  keyCooldownUntil.set(key, Date.now() + ms);
}

/** Healthy keys first, cooling keys last (still tried as a last resort). */
function orderKeysByHealth(keys: string[]): string[] {
  return [...keys].sort((a, b) => Number(isKeyCooling(a)) - Number(isKeyCooling(b)));
}

/** 429 rate limit, request timeout, or 5xx server overload → try another key. */
function isOverloadStatus(status: number): boolean {
  return (
    status === 429 ||
    status === 408 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 529
  );
}

/** Invalid / revoked / quota-exhausted key → switch keys and rest this one. */
function isAuthStatus(status: number): boolean {
  return status === 401 || status === 403;
}

function parseRetryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, RATE_LIMIT_COOLDOWN_MS * 5);
  }
  return undefined;
}

function parseCompletionError(status: number, body: string): string {
  try {
    const payload = JSON.parse(body) as ChatCompletionResponse;
    if (payload.error?.message) {
      return payload.error.message;
    }
  } catch {
    // Fall through to raw body.
  }
  return body.slice(0, 200) || `HTTP ${status}`;
}

export async function requestChatCompletion(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: ChatCompletionMessage[],
  options: ChatCompletionRequestOptions = {},
  debugContext?: Pick<LlmDebugInfo, "provider" | "endpoint" | "usedFallbackModel">
): Promise<string> {
  const maxTokens = options.maxTokens ?? 512;
  const temperature = options.temperature ?? 0.7;
  const topP = options.topP ?? 0.9;
  const presencePenalty = options.presencePenalty ?? 0.3;
  const frequencyPenalty = options.frequencyPenalty ?? 0.2;
  const seed = options.seed ?? (Date.now() % 1_000_000_000);

  const startedAt = Date.now();
  let statusCode: number | null = null;
  let errorMessage: string | null = null;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
      },
      body: JSON.stringify({
        model,
        temperature,
        top_p: topP,
        presence_penalty: presencePenalty,
        frequency_penalty: frequencyPenalty,
        seed,
        max_tokens: maxTokens,
        stream: false,
        messages,
      }),
    });

    statusCode = response.status;
    const body = await response.text();

    if (!response.ok) {
      errorMessage = parseCompletionError(response.status, body);
      throw new LlmHttpError(
        response.status,
        errorMessage,
        parseRetryAfterMs(response.headers.get("retry-after"))
      );
    }

    const payload = JSON.parse(body) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      errorMessage = "LLM returned empty content";
      throw new Error(errorMessage);
    }

    if (debugContext) {
      logLlmDebug({
        ...debugContext,
        model,
        statusCode,
        latencyMs: Date.now() - startedAt,
        errorMessage: null,
        at: new Date().toISOString(),
      });
    }

    return content;
  } catch (error) {
    if (debugContext) {
      logLlmDebug({
        ...debugContext,
        model,
        statusCode,
        latencyMs: Date.now() - startedAt,
        errorMessage:
          errorMessage ??
          (error instanceof Error ? error.message : "Unknown LLM request failure"),
        at: new Date().toISOString(),
      });
    }
    throw error;
  }
}

/**
 * Live chat completion with automatic key failover. Tries each configured key
 * (healthy ones first); on a rate-limit / overload / auth failure the key is put
 * on cooldown and the next key is used immediately. Within a key, falls back to
 * the secondary model for model-level errors.
 */
export async function callLiveChatCompletion(
  messages: ChatCompletionMessage[],
  options: ChatCompletionRequestOptions = {}
): Promise<string> {
  const keys = getLlmApiKeys();
  if (keys.length === 0) {
    throw new Error("Missing EXPO_PUBLIC_AI_API_KEY");
  }

  const base = buildLlmBaseConfig();
  const models =
    base.fallbackModel && base.fallbackModel !== base.model
      ? [base.model, base.fallbackModel]
      : [base.model];

  let lastError: unknown;

  for (const key of orderKeysByHealth(keys)) {
    for (const [modelIndex, model] of models.entries()) {
      try {
        return await requestChatCompletion(
          base.endpoint,
          key,
          model,
          messages,
          options,
          {
            provider: base.provider,
            endpoint: base.endpoint,
            usedFallbackModel: modelIndex > 0,
          }
        );
      } catch (error) {
        lastError = error;
        if (error instanceof LlmHttpError) {
          if (isOverloadStatus(error.status)) {
            coolKey(key, error.retryAfterMs ?? RATE_LIMIT_COOLDOWN_MS);
            break; // rate-limited/overloaded — next key, not next model
          }
          if (isAuthStatus(error.status)) {
            coolKey(key, AUTH_COOLDOWN_MS);
            break; // bad key — next key
          }
          // Other 4xx (e.g. unknown model): try the fallback model on this key.
          continue;
        }
        // Network-level failure: move on to the next key.
        break;
      }
    }
  }

  throw lastError ?? new Error("All LLM keys exhausted");
}

/** True if at least one configured key can reach the provider. */
export async function checkLlmConnection(_config?: LlmApiConfig): Promise<boolean> {
  const keys = getLlmApiKeys();
  if (keys.length === 0) {
    return false;
  }

  const base = buildLlmBaseConfig();

  for (const key of orderKeysByHealth(keys)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(base.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: base.model,
          max_tokens: 1,
          temperature: 0,
          stream: false,
          messages: [{ role: "user", content: "ping" }],
        }),
        signal: controller.signal,
      });

      if (response.ok) {
        return true;
      }
      if (isOverloadStatus(response.status)) {
        coolKey(key, RATE_LIMIT_COOLDOWN_MS);
      } else if (isAuthStatus(response.status)) {
        coolKey(key, AUTH_COOLDOWN_MS);
      }
    } catch {
      // try next key
    } finally {
      clearTimeout(timeout);
    }
  }

  return false;
}
