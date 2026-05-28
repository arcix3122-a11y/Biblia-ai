#!/usr/bin/env node
/**
 * Local eval harness: call live LLM with varied prompts and fail if replies repeat.
 * Reads EXPO_PUBLIC_* from .env when present; exits 0 (skip) when no API key is set.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildLlmBaseConfig,
  callLiveChatCompletion,
  hasLlmApiKey,
  resolveLlmProvider,
} from "../src/services/ai/llmClient.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, ".env");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function normalizeReply(text) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Jaccard overlap on word tokens — flags near-duplicate canned replies. */
function tokenOverlap(a, b) {
  const wordsA = new Set(normalizeReply(a).split(" ").filter(Boolean));
  const wordsB = new Set(normalizeReply(b).split(" ").filter(Boolean));
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection += 1;
  }
  const union = new Set([...wordsA, ...wordsB]).size;
  return intersection / union;
}

const SYSTEM_PROMPT =
  "You are a concise Christian spiritual companion. Answer in 2-4 sentences. " +
  "Vary tone and content to match the user's specific question.";

const SAMPLE_PROMPTS = [
  "What does John 3:16 mean for daily life?",
  "I feel anxious before work. Offer a short prayer.",
  "Explain the difference between faith and works in James.",
  "How can I forgive someone who hurt me deeply?",
  "Suggest one Psalm for comfort tonight and why.",
];

const OVERLAP_THRESHOLD = 0.85;

loadEnvFile(envPath);

if (!hasLlmApiKey()) {
  console.log(
    "ai:smoke skipped — set EXPO_PUBLIC_AI_API_KEY in .env (or env) to run live eval."
  );
  process.exit(0);
}

const base = buildLlmBaseConfig();
const provider = resolveLlmProvider();
console.log(
  `ai:smoke running (${provider}, model ${base.model}, ${SAMPLE_PROMPTS.length} prompts)…`
);

const responses = [];

for (let i = 0; i < SAMPLE_PROMPTS.length; i += 1) {
  const userPrompt = SAMPLE_PROMPTS[i];
  process.stdout.write(`  [${i + 1}/${SAMPLE_PROMPTS.length}] ${userPrompt.slice(0, 48)}… `);
  try {
    const content = await callLiveChatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 220, temperature: 0.65 }
    );
    responses.push({ prompt: userPrompt, content });
    console.log(`ok (${content.length} chars)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log("failed");
    console.error(`\nai:smoke failed on prompt ${i + 1}: ${message}`);
    process.exit(1);
  }
}

const normalized = responses.map((r) => normalizeReply(r.content));
const unique = new Set(normalized);

if (unique.size < responses.length) {
  console.error("\nai:smoke failed — identical normalized replies detected:");
  for (const entry of responses) {
    console.error(`  - ${entry.prompt}`);
    console.error(`    ${entry.content.slice(0, 120)}${entry.content.length > 120 ? "…" : ""}`);
  }
  process.exit(1);
}

const overlaps = [];
for (let i = 0; i < responses.length; i += 1) {
  for (let j = i + 1; j < responses.length; j += 1) {
    const score = tokenOverlap(responses[i].content, responses[j].content);
    if (score >= OVERLAP_THRESHOLD) {
      overlaps.push({ i, j, score });
    }
  }
}

if (overlaps.length > 0) {
  console.error("\nai:smoke failed — replies are too similar (possible canned loop):");
  for (const { i, j, score } of overlaps) {
    console.error(
      `  prompts ${i + 1} & ${j + 1}: ${Math.round(score * 100)}% token overlap`
    );
  }
  process.exit(1);
}

console.log(
  `\nai:smoke passed — ${unique.size}/${responses.length} distinct replies, no high-overlap pairs.`
);
process.exit(0);
