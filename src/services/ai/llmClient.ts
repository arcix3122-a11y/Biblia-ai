export type LlmProvider = "groq" | "openai";

export interface LlmApiConfig {
  provider: LlmProvider;
  apiKey: string;
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

export function resolveLlmProvider(): LlmProvider {
  const rawProvider = process.env.EXPO_PUBLIC_AI_PROVIDER?.trim().toLowerCase();
  if (rawProvider === "openai") {
    return "openai";
  }
  if (rawProvider === "groq") {
    return "groq";
  }

  const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY?.trim() ?? "";
  if (apiKey.startsWith("gsk_")) {
    return "groq";
  }

  const endpointHint =
    process.env.EXPO_PUBLIC_AI_API_URL?.toLowerCase() ||
    process.env.EXPO_PUBLIC_OPENAI_API_URL?.toLowerCase() ||
    "";
  return endpointHint.includes("groq.com") ? "groq" : "openai";
}

export function buildLlmApiConfig(): LlmApiConfig {
  const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_AI_API_KEY");
  }

  const provider = resolveLlmProvider();
  const defaults = PROVIDER_DEFAULTS[provider];

  return {
    provider,
    apiKey,
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

export function hasLlmApiKey(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_AI_API_KEY?.trim());
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
  maxTokens = 700
): Promise<string> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: maxTokens,
      stream: false,
      messages,
    }),
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`LLM ${response.status}: ${parseCompletionError(response.status, body)}`);
  }

  const payload = JSON.parse(body) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("LLM returned empty content");
  }
  return content;
}

export async function callLiveChatCompletion(
  messages: ChatCompletionMessage[],
  config = buildLlmApiConfig()
): Promise<string> {
  try {
    return await requestChatCompletion(config.endpoint, config.apiKey, config.model, messages);
  } catch (error) {
    if (config.fallbackModel !== config.model) {
      return requestChatCompletion(config.endpoint, config.apiKey, config.fallbackModel, messages);
    }
    throw error;
  }
}

export async function checkLlmConnection(config = buildLlmApiConfig()): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 1,
        temperature: 0,
        stream: false,
        messages: [{ role: "user", content: "ping" }],
      }),
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
