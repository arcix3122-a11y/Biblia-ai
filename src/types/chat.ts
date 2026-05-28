export type ChatRole = "user" | "assistant";
export type ChatSource = "live" | "offline" | "system";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  source?: ChatSource;
}
