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

async function callLiveAssistant(
  history: Array<{ role: "user" | "assistant"; content: string }>,
  verse: SelectedVerse | null,
  locale: "en" | "pl"
): Promise<string> {
  const messages: ChatCompletionMessage[] = [
    { role: "system", content: buildAssistantSystemPrompt(locale, verse) },
    ...history.map((item) => ({ role: item.role, content: item.content })),
  ];

  return callLiveChatCompletion(messages);
}

export function useSpiritualAssistant() {
  const { t, locale } = useAppTranslation();
  const {
    messages: chatMessages,
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
      addUserMessage(trimmed);
      setIsThinking(true);

      const history = chatMessages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .slice(-20)
        .map((message) => ({
          role: message.role as "user" | "assistant",
          content: message.content,
        }));
      history.push({ role: "user", content: trimmed });

      const useLiveApi = hasLlmApiKey();

      try {
        let reply = "";
        if (useLiveApi) {
          reply = await callLiveAssistant(history, verse, locale);
        } else {
          const firstAid = await generateSpiritualFirstAidKit(trimmed, {
            locale,
            translation: locale,
            verse,
          });
          reply = firstAid.commentary;
        }

        addAssistantMessage(reply, useLiveApi ? "live" : "offline");
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
          locale,
        });

        let fallback = "";
        try {
          const firstAid = await generateSpiritualFirstAidKit(trimmed, {
            locale,
            translation: locale,
            verse,
          });
          fallback = firstAid.commentary;
        } catch {
          fallback = buildOfflineCompanionReply(trimmed, verse);
        }

        addAssistantMessage(fallback, "offline");

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
      chatMessages,
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
  };
}
