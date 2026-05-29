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

async function test(prompt, history = []) {
  const messages = [
    {
      role: "system",
      content:
        "You are Biblia AI Companion. Reply in Polish. Be concise and vary your wording.",
    },
    ...history,
    { role: "user", content: prompt },
  ];

  const start = Date.now();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "Cache-Control": "no-cache",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      top_p: 0.9,
      presence_penalty: 0.3,
      max_tokens: 300,
      stream: false,
      messages,
    }),
  });

  const body = await response.text();
  const latencyMs = Date.now() - start;

  if (!response.ok) {
    console.log(`FAIL status=${response.status} latency=${latencyMs}ms`);
    console.log(body.slice(0, 500));
    return null;
  }

  const payload = JSON.parse(body);
  const content = payload.choices?.[0]?.message?.content?.trim() ?? "";
  console.log(`OK status=${response.status} latency=${latencyMs}ms len=${content.length}`);
  console.log(content.slice(0, 200));
  console.log("---");
  return content;
}

const history = [];
for (const prompt of [
  "Co znaczy werset Jan 3:16?",
  "Jak modlić się w lęku?",
  "Wyjaśnij Psalm 23 krótko.",
]) {
  const reply = await test(prompt, history);
  if (reply) {
    history.push({ role: "user", content: prompt });
    history.push({ role: "assistant", content: reply });
  }
}
