import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

const key = process.env.EXPO_PUBLIC_AI_API_KEY;
const endpoint = process.env.EXPO_PUBLIC_AI_API_URL?.trim();
const model = process.env.EXPO_PUBLIC_AI_MODEL?.trim() || "llama-3.3-70b-versatile";
const fallbackModel = "llama-3.1-8b-instant";

async function requestChatCompletion(endpoint, apiKey, model, messages) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: 700,
      stream: false,
      messages,
    }),
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body: body.slice(0, 300) };
}

const messages = [
  {
    role: "system",
    content:
      "You are Biblia AI Companion, a Christian Scripture-first companion inside a mobile Bible app.\nReply in Polish.\nBase answers on the Bible first.",
  },
  { role: "user", content: "Co znaczy werset Jan 3:16?" },
];

for (const m of [model, fallbackModel]) {
  const result = await requestChatCompletion(endpoint, key, m, messages);
  console.log(`model=${m} ok=${result.ok} status=${result.status}`);
  console.log(result.body);
  console.log("---");
}
