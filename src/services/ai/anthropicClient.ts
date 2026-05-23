import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  if (!client) {
    client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
}

export const SPIRITUAL_SYSTEM_PROMPT = `You are a warm, scholarly spiritual companion helping users engage with Scripture. You offer:
- Historical and cultural context for passages
- Practical daily-life applications
- Original language insights (Greek/Hebrew)
- Prayerful reflection prompts

Tone: reverent, clear, accessible. Avoid dogmatic sectarianism. Keep responses concise (3-5 sentences) unless more depth is requested. Never claim to replace pastoral care or counseling.`;
