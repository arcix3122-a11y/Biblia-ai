import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAiChatStore } from "@/store/aiChatStore";
import { logError } from "@/services/errors/errorLogger";
import {
  buildLlmApiConfig,
  callLiveChatCompletion,
  hasLlmApiKey,
  resolveLlmProvider,
  type ChatCompletionMessage,
} from "@/services/ai/llmClient";
import i18n from "@/i18n";
import type { SelectedVerse } from "@/store/selectionStore";
import type { ContextPillTemplateId } from "@/types/ui";

const BASE_SYSTEM_PROMPT =
  "You are a warm, scholarly spiritual companion helping users engage with Scripture. Offer concise and practical guidance grounded in biblical text, with pastoral sensitivity and theological care.";

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

function localFallback(userText: string): string {
  const idx = Math.abs(hashString(userText)) % FALLBACK_KEYS.length;
  const key = FALLBACK_KEYS[idx] ?? FALLBACK_KEYS[0];
  return i18n.t(key);
}

async function callLiveAssistant(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  verse: SelectedVerse | null
): Promise<string> {
  const messages: ChatCompletionMessage[] = [
    { role: "system", content: buildSystemPrompt(verse) },
    ...history.map((item) => ({ role: item.role, content: item.content })),
  ];

  return callLiveChatCompletion(messages);
}

export function useSpiritualAssistant() {
  const { t } = useTranslation();
  const { messages: chatMessages, addUserMessage, addAssistantMessage, consumeMessageQuota, canSend, remaining, messageCount, limit } =
    useAiChatStore();
  const [isThinking, setIsThinking] = useState(false);
  const [connectionWarning, setConnectionWarning] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<string | null>(null);

  const clearConnectionWarning = useCallback(() => {
    setConnectionWarning(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string, verse: SelectedVerse | null = null): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || !canSend()) return false;

      setConnectionWarning(null);
      addUserMessage(trimmed);
      setIsThinking(true);

      const history = chatMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-20)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      history.push({ role: "user", content: trimmed });

      const useLiveApi = hasLlmApiKey();

      try {
        const reply = useLiveApi ? await callLiveAssistant(history, verse) : localFallback(trimmed);
        addAssistantMessage(reply);
        if (useLiveApi) {
          consumeMessageQuota();
        }
        setLastInput(null);
        return true;
      } catch (error) {
        logError(error, "spiritual-assistant-live", {
          hasApiKey: useLiveApi,
          provider: resolveLlmProvider(),
          hasVerseContext: Boolean(verse),
        });

        const fallback = localFallback(trimmed);
        addAssistantMessage(fallback);

        if (useLiveApi) {
          setConnectionWarning(t("ai.connectionFallback"));
        }

        setLastInput(trimmed);
        return true;
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

  const hasApiKey = hasLlmApiKey();
  let provider = "";
  let model = "";
  let endpoint = "";

  if (hasApiKey) {
    try {
      const config = buildLlmApiConfig();
      provider = config.provider;
      model = config.model;
      endpoint = config.endpoint;
    } catch {
      // Ignored
    }
  }

  return {
    sendMessage,
    sendWithContext,
    isThinking,
    canSend,
    remaining,
    messageCount,
    limit,
    hasApiKey,
    provider,
    model,
    endpoint,
    connectionWarning,
    clearConnectionWarning,
    lastInput,
  };
}
