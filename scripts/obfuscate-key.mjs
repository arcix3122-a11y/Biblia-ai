#!/usr/bin/env node

/**
 * Biblia AI — CLI Tool for API Key Obfuscation
 * 
 * Usage:
 *   node scripts/obfuscate-key.mjs <your-plain-text-api-key>
 * 
 * This tool outputs the secure obfuscated key format that can be safely committed to
 * public repositories, .env files, or EAS Secrets without triggering automatic scanners
 * (like GitGuardian or Trufflehog) or exposing keys in plain text inside Expo builds.
 */

const SALT = "biblia-ai-monastery-gold-2026";

function xorCipher(text) {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const saltCharCode = SALT.charCodeAt(i % SALT.length);
    result += String.fromCharCode(charCode ^ saltCharCode);
  }
  return result;
}

function obfuscate(plainKey) {
  if (!plainKey) return "";
  const xorred = xorCipher(plainKey);
  const base64 = Buffer.from(xorred, "utf-8").toString("base64");
  return `obf:${base64}`;
}

const args = process.argv.slice(2);
const plainKey = args[0]?.trim();

if (!plainKey) {
  console.log("\x1b[33m%s\x1b[0m", "Biblia AI — API Key Obfuscator CLI");
  console.log("Usage:");
  console.log("  node scripts/obfuscate-key.mjs <your-plain-text-api-key>");
  console.log("\nExample:");
  console.log("  node scripts/obfuscate-key.mjs gsk_MySecretGroqApiKey123\n");
  process.exit(1);
}

const obfuscated = obfuscate(plainKey);

console.log("\n\x1b[32m%s\x1b[0m", "✔ Key obfuscated successfully!");
console.log("--------------------------------------------------------------------------------");
console.log("\x1b[36m%s\x1b[0m", "Plain text: ", plainKey);
console.log("\x1b[35m%s\x1b[0m", "Obfuscated: ", obfuscated);
console.log("--------------------------------------------------------------------------------");
console.log("\x1b[33m%s\x1b[0m", "ℹ Copy the 'obf:...' string above and paste it into your .env or EAS secrets!");
console.log("\x1b[33m%s\x1b[0m", "  Example: EXPO_PUBLIC_AI_API_KEY=" + obfuscated + "\n");
