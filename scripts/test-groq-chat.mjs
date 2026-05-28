/**
 * Smoke test for Groq/OpenAI chat payload used by llmClient.
 * Usage: node scripts/test-groq-chat.mjs
 */
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

const key = process.env.EXPO_PUBLIC_AI_API_KEY;
const endpoint =
  process.env.EXPO_PUBLIC_AI_API_URL?.trim() ||
  "https://api.groq.com/openai/v1/chat/completions";
const model = process.env.EXPO_PUBLIC_AI_MODEL?.trim() || "llama-3.3-70b-versatile";

if (!key || key.startsWith("your-")) {
  console.error("Missing usable EXPO_PUBLIC_AI_API_KEY in .env");
  process.exit(1);
}

async function callChat(messages, seed) {
  const startedAt = Date.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "Cache-Control": "no-cache, no-store",
      Pragma: "no-cache",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      top_p: 0.9,
      presence_penalty: 0.3,
      frequency_penalty: 0.2,
      seed,
      max_tokens: 300,
      stream: false,
      messages,
    }),
  });

  const body = await response.text();
  const latencyMs = Date.now() - startedAt;

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} (${latencyMs}ms): ${body.slice(0, 300)}`);
  }

  const payload = JSON.parse(body);
  const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw new Error(`Empty completion (${latencyMs}ms)`);
  }

  return { content, latencyMs, status: response.status };
}

const history = [];
const prompts = [
  "Co znaczy werset Jan 3:16?",
  "Jak modlić się w lęku?",
  "Wyjaśnij Psalm 23 krótko.",
];

for (const [index, prompt] of prompts.entries()) {
  const messages = [
    {
      role: "system",
      content:
        "You are Biblia AI Companion. Reply in Polish. Be concise and vary your wording.",
    },
    ...history,
    { role: "user", content: prompt },
  ];

  const { content, latencyMs, status } = await callChat(messages, Date.now() % 1_000_000_000 + index);
  console.log(`OK status=${status} latency=${latencyMs}ms`);
  console.log(content.slice(0, 180));
  console.log("---");

  history.push({ role: "user", content: prompt });
  history.push({ role: "assistant", content });
}

console.log("Groq chat smoke test passed.");
