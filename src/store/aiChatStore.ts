import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
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
}

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

const WELCOME_MESSAGE = createMessage(
  "assistant",
  "Peace be with you. I am your spiritual companion — ask about Scripture, prayer, or faith. Set EXPO_PUBLIC_AI_API_KEY for live responses; otherwise local previews are used."
);

export const useAiChatStore = create<AiChatState>()(
  persist(
    (set, get) => ({
      messages: [WELCOME_MESSAGE],
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
          messages: [
            createMessage(
              "assistant",
              "Chat cleared. How may I walk with you in Scripture today?"
            ),
          ],
          messageCount: 0,
        }),
    }),
    {
      name: "@biblia-ai/chat",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        messages: state.messages,
        messageCount: state.messageCount,
      }),
    }
  )
);
