import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import i18n from "@/i18n";
import type { ChatMessage } from "@/types/chat";

const FREE_MESSAGE_LIMIT = 20;

interface AiChatState {
  messages: ChatMessage[];
  messageCount: number;
  limit: number;
  addUserMessage: (content: string) => ChatMessage;
  addAssistantMessage: (content: string) => void;
  consumeMessageQuota: () => void;
  canSend: () => boolean;
  remaining: () => number;
  resetChat: () => void;
  ensureWelcomeMessage: () => void;
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function welcomeMessage(): ChatMessage {
  return createMessage("assistant", i18n.t("ai.welcomeMessage"));
}

function needsWelcomeMessage(messages: ChatMessage[]): boolean {
  if (messages.length === 0) {
    return true;
  }
  return !messages.some((message) => message.role === "assistant");
}

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set, get) => ({
      messages: [welcomeMessage()],
      messageCount: 0,
      limit: FREE_MESSAGE_LIMIT,

      addUserMessage: (content) => {
        const message = createMessage("user", content);
        set((state) => ({
          messages: [...state.messages, message],
        }));
        return message;
      },

      addAssistantMessage: (content) => {
        const message = createMessage("assistant", content);
        set((state) => ({ messages: [...state.messages, message] }));
      },

      consumeMessageQuota: () => {
        set((state) => ({ messageCount: Math.min(state.limit, state.messageCount + 1) }));
      },

      canSend: () => get().messageCount < get().limit,

      remaining: () => Math.max(0, get().limit - get().messageCount),

      resetChat: () =>
        set({
          messages: [createMessage("assistant", i18n.t("ai.chatCleared"))],
          messageCount: 0,
        }),

      ensureWelcomeMessage: () => {
        const { messages } = get();
        if (!needsWelcomeMessage(messages)) {
          return;
        }
        set({ messages: [welcomeMessage(), ...messages] });
      },
    }),
    {
      name: "@biblia-ai/chat",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        messages: state.messages,
        messageCount: state.messageCount,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }
        if (needsWelcomeMessage(state.messages)) {
          state.messages = [welcomeMessage(), ...state.messages];
        }
      },
    }
  )
);
