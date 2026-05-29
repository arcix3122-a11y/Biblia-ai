import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import i18n from "@/i18n";
import { getEffectiveLimit } from "@/data/aiQuotaTiers";
import type { DonorTierId } from "@/data/donationTiers";
import type { ChatMessage, ChatRole, ChatSource } from "@/types/chat";

interface AiChatState {
  messages: ChatMessage[];
  messageCount: number;
  limit: number;
  donorTier: DonorTierId | null;
  quotaDayKey: string;
  addUserMessage: (content: string) => ChatMessage;
  addAssistantMessage: (content: string, source?: ChatSource) => void;
  consumeMessageQuota: () => void;
  canSend: () => boolean;
  remaining: () => number;
  clearConversation: () => void;
  resetQuotaAndChat: () => void;
  ensureWelcomeMessage: () => void;
  refreshIntroMessage: () => void;
  syncDailyQuota: () => void;
  syncLimitFromDonorTier: (donorTier: DonorTierId | null) => void;
}

function getTodayQuotaKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function createMessage(
  role: ChatRole,
  content: string,
  source?: ChatSource
): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    source:
      source ??
      (role === "assistant" ? "live" : undefined),
  };
}

function welcomeMessage(): ChatMessage {
  return createMessage("assistant", i18n.t("ai.welcomeMessage"), "system");
}

function clearedMessage(): ChatMessage {
  return createMessage("assistant", i18n.t("ai.chatCleared"), "system");
}

function needsWelcomeMessage(messages: ChatMessage[]): boolean {
  if (messages.length === 0) {
    return true;
  }
  return !messages.some((message) => message.role === "assistant");
}

function syncPersistedState(
  state: Pick<AiChatState, "messages" | "messageCount" | "quotaDayKey">,
  donorTier: DonorTierId | null
): Pick<AiChatState, "messages" | "messageCount" | "quotaDayKey" | "limit"> {
  const today = getTodayQuotaKey();
  const nextMessages = needsWelcomeMessage(state.messages)
    ? [welcomeMessage(), ...state.messages]
    : state.messages;

  return {
    messages: nextMessages,
    messageCount: state.quotaDayKey === today ? state.messageCount : 0,
    quotaDayKey: today,
    limit: getEffectiveLimit(donorTier),
  };
}

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set, get) => ({
      messages: [welcomeMessage()],
      messageCount: 0,
      limit: getEffectiveLimit(null),
      donorTier: null,
      quotaDayKey: getTodayQuotaKey(),

      addUserMessage: (content) => {
        const message = createMessage("user", content);
        set((state) => ({
          messages: [...state.messages, message],
        }));
        return message;
      },

      addAssistantMessage: (content, source = "live") => {
        const message = createMessage("assistant", content, source);
        set((state) => ({ messages: [...state.messages, message] }));
      },

      consumeMessageQuota: () => {
        get().syncDailyQuota();
        set((state) => ({
          messageCount: Math.min(state.limit, state.messageCount + 1),
        }));
      },

      canSend: () => get().messageCount < get().limit,

      remaining: () => Math.max(0, get().limit - get().messageCount),

      clearConversation: () =>
        set((state) => ({
          messages: [clearedMessage()],
          messageCount: state.messageCount,
          quotaDayKey: state.quotaDayKey,
        })),

      resetQuotaAndChat: () =>
        set({
          messages: [clearedMessage()],
          messageCount: 0,
          quotaDayKey: getTodayQuotaKey(),
        }),

      ensureWelcomeMessage: () => {
        const { messages } = get();
        if (!needsWelcomeMessage(messages)) {
          return;
        }
        set({ messages: [welcomeMessage(), ...messages] });
      },

      refreshIntroMessage: () => {
        const { messages } = get();
        const hasUserMessages = messages.some((message) => message.role === "user");
        if (hasUserMessages) {
          return;
        }
        set({ messages: [welcomeMessage()] });
      },

      syncDailyQuota: () => {
        const today = getTodayQuotaKey();
        const { quotaDayKey } = get();
        if (quotaDayKey === today) {
          return;
        }
        set({ messageCount: 0, quotaDayKey: today });
      },

      syncLimitFromDonorTier: (donorTier) => {
        set({
          donorTier,
          limit: getEffectiveLimit(donorTier),
        });
      },
    }),
    {
      name: "@biblia-ai/chat",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        messages: state.messages,
        messageCount: state.messageCount,
        quotaDayKey: state.quotaDayKey,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }

        const donorTier = state.donorTier ?? null;
        const synced = syncPersistedState(
          {
            messages: state.messages,
            messageCount: state.messageCount,
            quotaDayKey: state.quotaDayKey ?? getTodayQuotaKey(),
          },
          donorTier
        );

        state.messages = synced.messages;
        state.messageCount = synced.messageCount;
        state.quotaDayKey = synced.quotaDayKey;
        state.limit = synced.limit;
      },
    }
  )
);

export { getEffectiveLimit };
