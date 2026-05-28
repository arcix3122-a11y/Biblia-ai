import { useCallback, useEffect, useMemo, useState } from "react";
import { useAiChatStore } from "@/store/aiChatStore";
import { logError } from "@/services/errors/errorLogger";
import {
  buildLlmApiConfig,
  callLiveChatCompletion,
  getLastLlmDebugInfo,
  hasLlmApiKey,
  resolveLlmProvider,
  type ChatCompletionMessage,
} from "@/services/ai/llmClient";
import { useAppTranslation } from "@/hooks/useAppTranslation";
import {
  buildAssistantSystemPrompt,
  buildOfflineCompanionReply,
  buildTemplatePrompt,
} from "@/services/ai/spiritualAssistantProfile";
import type { SelectedVerse } from "@/store/selectionStore";
import type { ContextPillTemplateId } from "@/types/ui";
import { generateSpiritualFirstAidKit } from "@/services/ai/spiritualFirstAidKit";

export type AssistantMode = "live" | "offline" | "fallback";
export type AssistantResponseMode = "LIVE_GROQ" | "OFFLINE_MOCK";

const ASSISTANT_CHAT_OPTIONS = {
  maxTokens: 512,
  temperature: 0.7,
  topP: 0.9,
} as const;

function isDevEnvironment(): boolean {
  return typeof __DEV__ !== "undefined" && __DEV__;
}

function buildConversationHistory(
  messages: Array<{ role: string; content: string; source?: string }>
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((message) => {
      if (message.role === "user") {
        return true;
      }
      return message.role === "assistant" && message.source !== "system";
    })
    .slice(-20)
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));
}

function ensureCurrentUserTurn(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  currentUserText: string
): Array<{ role: "user" | "assistant"; content: string }> {
  const trimmed = currentUserText.trim();
  if (!trimmed) {
    return history;
  }

  const last = history[history.length - 1];
  if (last?.role === "user" && last.content === trimmed) {
    return history;
  }

  return [...history, { role: "user", content: trimmed }];
}

async function callLiveAssistant(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  verse: SelectedVerse | null,
  locale: "en" | "pl"
): Promise<string> {
  const messages: ChatCompletionMessage[] = [
    { role: "system", content: buildAssistantSystemPrompt(locale, verse) },
    ...history.map((item) => ({ role: item.role, content: item.content })),
  ];

  return callLiveChatCompletion(messages, ASSISTANT_CHAT_OPTIONS);
}

export function useSpiritualAssistant() {
  const { t, locale } = useAppTranslation();
  const {
    addUserMessage,
    addAssistantMessage,
    consumeMessageQuota,
    canSend,
    remaining,
    messageCount,
    limit,
    syncDailyQuota,
  } = useAiChatStore();
  const [isThinking, setIsThinking] = useState(false);
  const [connectionWarning, setConnectionWarning] = useState<string | null>(null);
  const [lastInput, setLastInput] = useState<string | null>(null);
  const [lastResponseMode, setLastResponseMode] = useState<AssistantResponseMode | null>(
    null
  );
  const [lastLlmError, setLastLlmError] = useState<string | null>(null);

  useEffect(() => {
    syncDailyQuota();
  }, [syncDailyQuota]);

  const clearConnectionWarning = useCallback(() => {
    setConnectionWarning(null);
  }, []);

  const sendMessage = useCallback(
    async (text: string, verse: SelectedVerse | null = null): Promise<boolean> => {
      syncDailyQuota();

      const trimmed = text.trim();
      if (!trimmed || !canSend()) {
        return false;
      }

      setConnectionWarning(null);
      setLastLlmError(null);
      addUserMessage(trimmed);
      setIsThinking(true);

      const history = ensureCurrentUserTurn(
        buildConversationHistory(useAiChatStore.getState().messages),
        trimmed
      );

      const useLiveApi = hasLlmApiKey();

      try {
        let reply = "";
        let replySource: "live" | "offline" = "offline";

        if (useLiveApi) {
          reply = await callLiveAssistant(history, verse, locale);
          replySource = "live";
          setLastResponseMode("LIVE_GROQ");
          setLastLlmError(null);
        } else {
          const firstAid = await generateSpiritualFirstAidKit(trimmed, {
            locale,
            translation: locale,
            verse,
          });
          reply = firstAid.commentary;
          replySource = firstAid.usedLiveApi ? "live" : "offline";
          setLastResponseMode(firstAid.usedLiveApi ? "LIVE_GROQ" : "OFFLINE_MOCK");
          setLastLlmError(null);
        }

        addAssistantMessage(reply, replySource);
        consumeMessageQuota();
        setLastInput(null);
        return true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setLastLlmError(errorMessage);
        setLastResponseMode("OFFLINE_MOCK");

        logError(error, "spiritual-assistant-live", {
          hasApiKey: useLiveApi,
          provider: resolveLlmProvider(),
          hasVerseContext: Boolean(verse),
          locale,
          llmDebug: getLastLlmDebugInfo(),
        });

        if (isDevEnvironment()) {
          console.warn("[spiritual-assistant] live request failed, using offline fallback", {
            provider: resolveLlmProvider(),
            llmDebug: getLastLlmDebugInfo(),
            error: errorMessage,
          });
        }

        const fallback = buildOfflineCompanionReply(trimmed, verse);

        addAssistantMessage(fallback, "offline");
        consumeMessageQuota();

        if (useLiveApi) {
          setConnectionWarning(t("ai.connectionFallback"));
        }

        setLastInput(trimmed);
        return true;
      } finally {
        setIsThinking(false);
      }
    },
    [
      addAssistantMessage,
      addUserMessage,
      canSend,
      consumeMessageQuota,
      locale,
      syncDailyQuota,
      t,
    ]
  );

  const sendWithContext = useCallback(
    async (templateId: ContextPillTemplateId, verse: SelectedVerse | null): Promise<boolean> => {
      if (!verse || !canSend()) {
        return false;
      }

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
      // Ignored: UI falls back to offline mode copy.
    }
  }

  const assistantMode: AssistantMode = connectionWarning
    ? "fallback"
    : hasApiKey
      ? "live"
      : "offline";

  const modeReason = useMemo(() => {
    if (assistantMode === "fallback") {
      return t("ai.statusFallbackHint");
    }
    if (assistantMode === "offline") {
      return t("ai.statusOfflineHint");
    }
    if (provider === "groq") {
      return t("ai.modeReasonLiveGroq");
    }
    if (provider === "openai") {
      return t("ai.modeReasonLiveOpenai");
    }
    return t("ai.statusLiveHint");
  }, [assistantMode, provider, t]);

  const modeLabel = useMemo(() => {
    if (assistantMode === "live") {
      return t("ai.statusLiveShort");
    }
    return t("ai.statusOfflineShort");
  }, [assistantMode, t]);

  return {
    sendMessage,
    sendWithContext,
    isThinking,
    canSend,
    remaining,
    messageCount,
    limit,
    hasApiKey,
    assistantMode,
    modeLabel,
    modeReason,
    provider,
    model,
    endpoint,
    connectionWarning,
    clearConnectionWarning,
    lastInput,
    lastResponseMode,
    lastLlmError,
  };
}
