import { useCallback, useState } from "react";
import { useAiChatStore } from "@/store/aiChatStore";
import { getAnthropicClient, SPIRITUAL_SYSTEM_PROMPT } from "@/services/ai/anthropicClient";
import type { SelectedVerse } from "@/store/selectionStore";
import type { ContextPillTemplateId } from "@/types/ui";

const TEMPLATE_PROMPTS: Record<ContextPillTemplateId, (verse: SelectedVerse) => string> = {
  historical: (v) =>
    `Explain the historical context of ${v.bookName} ${v.chapter}:${v.verse} — "${v.text}"`,
  application: (v) =>
    `Give a practical daily-life application for ${v.bookName} ${v.chapter}:${v.verse} — "${v.text}"`,
  "original-language": (v) =>
    `Break down the original Greek or Hebrew meaning of key terms in ${v.bookName} ${v.chapter}:${v.verse} — "${v.text}"`,
};

const FALLBACK_RESPONSES: readonly string[] = [
  "Scripture reminds us that God's mercies are new every morning. What passage is on your heart today?",
  "In prayer, we draw near to the One who hears. Consider pausing for a moment of stillness before you continue reading.",
  "Faith is strengthened in community and in the Word. Would you like a verse to meditate on from what you've read?",
  "The Spirit intercedes for us with groanings too deep for words. Bring your burdens honestly before God.",
  "Wisdom begins with reverence for the Lord. As you read, ask: what is God inviting me to trust or obey?",
];

async function callClaude(messages: Array<{ role: "user" | "assistant"; content: string }>): Promise<string> {
  const client = getAnthropicClient();
  if (!client) {
    // Graceful fallback when no API key is configured
    const last = messages[messages.length - 1]?.content ?? "";
    const idx = Math.abs(last.split("").reduce((h, c) => (h << 5) - h + c.charCodeAt(0), 0)) % FALLBACK_RESPONSES.length;
    return FALLBACK_RESPONSES[idx] ?? FALLBACK_RESPONSES[0];
  }
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: SPIRITUAL_SYSTEM_PROMPT,
    messages,
  });
  const block = response.content[0];
  if (block?.type === "text") return block.text;
  return FALLBACK_RESPONSES[0];
}

export function useSpiritualAssistant() {
  const { messages: chatMessages, addUserMessage, addAssistantMessage, consumeMessageQuota, canSend, remaining, messageCount, limit } =
    useAiChatStore();
  const [isThinking, setIsThinking] = useState(false);

  const sendMessage = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed || !canSend()) return false;

      addUserMessage(trimmed);
      consumeMessageQuota();
      setIsThinking(true);

      try {
        // Build conversation history for Claude (exclude initial welcome message, last 20 msgs)
        const history = chatMessages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-20)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
        history.push({ role: "user", content: trimmed });

        const reply = await callClaude(history);
        addAssistantMessage(reply);
      } catch {
        addAssistantMessage("I'm having trouble connecting right now. Please try again in a moment.");
      } finally {
        setIsThinking(false);
      }
      return true;
    },
    [addAssistantMessage, addUserMessage, canSend, chatMessages, consumeMessageQuota]
  );

  const sendWithContext = useCallback(
    async (templateId: ContextPillTemplateId, verse: SelectedVerse | null): Promise<boolean> => {
      if (!verse || !canSend()) return false;
      const prompt = TEMPLATE_PROMPTS[templateId](verse);
      return sendMessage(prompt);
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
