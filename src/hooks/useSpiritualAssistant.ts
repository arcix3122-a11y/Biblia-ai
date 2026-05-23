import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAiChatStore } from "@/store/aiChatStore";
import { logError } from "@/services/errors/errorLogger";
import i18n from "@/i18n";
import type { SelectedVerse } from "@/store/selectionStore";
import type { ContextPillTemplateId } from "@/types/ui";

const BASE_SYSTEM_PROMPT =
  "You are a warm, scholarly spiritual companion helping users engage with Scripture. Offer concise and practical guidance grounded in biblical text, with pastoral sensitivity and theological care.";

type Provider = "groq" | "openai";

const PROVIDER_DEFAULTS: Record<Provider, { endpoint: string; model: string; fallbackModel: string }> = {
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

interface ChatCompletionMessage {
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
}

const FALLBACK_KEYS = [
  "ai.fallback1",
  "ai.fallback2",
  "ai.fallback3",
  "ai.fallback4",
  "ai.fallback5",
] as const;

function buildTemplatePrompt(templateId: ContextPillTemplateId, verse: SelectedVerse): string {
  const key =
    templateId === "historical"
      ? "ai.templateHistorical"
      : templateId === "application"
        ? "ai.templateApplication"
        : "ai.templateOriginalLanguage";

  return i18n.t(key, {
    bookName: verse.bookName,
    chapter: verse.chapter,
    verse: verse.verse,
    text: verse.text,
  });
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function buildSystemPrompt(verse: SelectedVerse | null): string {
  if (!verse) {
    return BASE_SYSTEM_PROMPT;
  }

  return `${BASE_SYSTEM_PROMPT}\n\nSelected verse context:\nReference: ${verse.bookName} ${verse.chapter}:${verse.verse}\nText: "${verse.text}"\n\nUse this context naturally where relevant.`;
}

function resolveProvider(): Provider {
  const rawProvider = process.env.EXPO_PUBLIC_AI_PROVIDER?.trim().toLowerCase();
  if (rawProvider === "openai") {
    return "openai";
  }
  if (rawProvider === "groq") {
    return "groq";
  }

  const endpointHint =
    process.env.EXPO_PUBLIC_AI_API_URL?.toLowerCase() ||
    process.env.EXPO_PUBLIC_OPENAI_API_URL?.toLowerCase() ||
    "";
  return endpointHint.includes("groq.com") ? "groq" : "openai";
}

function buildApiConfig(): {
  provider: Provider;
  apiKey: string;
  endpoint: string;
  model: string;
  fallbackModel: string;
} {
  const apiKey = process.env.EXPO_PUBLIC_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing EXPO_PUBLIC_AI_API_KEY");
  }

  const provider = resolveProvider();
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

async function requestCompletion(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: ChatCompletionMessage[]
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
      max_tokens: 700,
      stream: false,
      messages,
    }),
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 500);
    throw new Error(`LLM ${response.status}: ${details}`);
  }

  const payload = (await response.json()) as ChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("LLM returned empty content");
  }
  return content;
}

async function callLiveAssistant(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  verse: SelectedVerse | null
): Promise<string> {
  const config = buildApiConfig();

  const messages: ChatCompletionMessage[] = [
    { role: "system", content: buildSystemPrompt(verse) },
    ...history.map((item) => ({ role: item.role, content: item.content })),
  ];

  try {
    return await requestCompletion(config.endpoint, config.apiKey, config.model, messages);
  } catch (error) {
    if (config.fallbackModel !== config.model) {
      return requestCompletion(config.endpoint, config.apiKey, config.fallbackModel, messages);
    }
    throw error;
  }
}

function localFallback(userText: string): string {
  const idx = Math.abs(hashString(userText)) % FALLBACK_KEYS.length;
  const key = FALLBACK_KEYS[idx] ?? FALLBACK_KEYS[0];
  return i18n.t(key);
}

export function useSpiritualAssistant() {
  const { t } = useTranslation();
  const { messages: chatMessages, addUserMessage, addAssistantMessage, consumeMessageQuota, canSend, remaining, messageCount, limit } =
    useAiChatStore();
  const [isThinking, setIsThinking] = useState(false);

  const sendMessage = useCallback(
    async (text: string, verse: SelectedVerse | null = null): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || !canSend()) return false;

      addUserMessage(trimmed);
      setIsThinking(true);

      try {
        const history = chatMessages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-20)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        history.push({ role: "user", content: trimmed });

        const reply = await callLiveAssistant(history, verse);
        addAssistantMessage(reply);
        consumeMessageQuota();
        return true;
      } catch (error) {
        logError(error, "spiritual-assistant-live", {
          hasApiKey: Boolean(process.env.EXPO_PUBLIC_AI_API_KEY),
          provider: resolveProvider(),
          hasVerseContext: Boolean(verse),
        });

        const fallback = process.env.EXPO_PUBLIC_AI_API_KEY
          ? t("ai.liveError")
          : localFallback(trimmed);
        addAssistantMessage(fallback);
        return false;
      } finally {
        setIsThinking(false);
      }
    },
    [addAssistantMessage, addUserMessage, canSend, chatMessages, consumeMessageQuota, t]
  );

  const sendWithContext = useCallback(
    async (templateId: ContextPillTemplateId, verse: SelectedVerse | null): Promise<boolean> => {
      if (!verse || !canSend()) return false;
      const prompt = buildTemplatePrompt(templateId, verse);
      return sendMessage(prompt, verse);
    },
    [canSend, sendMessage]
  );

  return {
    sendMessage,
    sendWithContext,
    isThinking,
    canSend,
    remaining,
    messageCount,
    limit,
  };
}
