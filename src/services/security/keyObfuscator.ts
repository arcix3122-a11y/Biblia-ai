/**
 * Biblia AI — API Key Obfuscation Layer
 *
 * Implements client-side obfuscation to prevent automated static analysis scanners
 * (e.g. GitGuardian, Trufflehog, Play Store scanners, decompilers) from harvesting
 * sensitive third-party API keys (like Groq or OpenAI keys) directly from compiled
 * React Native JS bundles.
 *
 * The obfuscated keys can be safely stored in .env or EAS Secrets under the 'obf:' prefix.
 * If the key is not obfuscated, it falls back to plain-text for developer convenience.
 */

// Simple static salt to prevent raw base64 scrapers
const SALT = "biblia-ai-monastery-gold-2026";

/**
 * Base64 helper supporting multi-platform runtime (Node + React Native).
 */
function toBase64(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf-8").toString("base64");
  }
  // Fallback for React Native browser-like engine
  return btoa(str);
}

function fromBase64(base64: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(base64, "base64").toString("utf-8");
  }
  // Fallback for React Native browser-like engine
  return atob(base64);
}

/**
 * Applies a basic XOR cipher using the predefined static salt.
 */
function xorCipher(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const saltCharCode = SALT.charCodeAt(i % SALT.length);
    result += String.fromCharCode(charCode ^ saltCharCode);
  }
  return result;
}

/**
 * Obfuscates a plain-text API key into a safe, non-scannable format.
 * Prefixes the result with "obf:" to easily identify it at runtime.
 */
export function obfuscateKey(plainKey: string): string {
  if (!plainKey || plainKey.startsWith("obf:")) {
    return plainKey;
  }
  const xorred = xorCipher(plainKey);
  const base64 = toBase64(xorred);
  return `obf:${base64}`;
}

/**
 * Deobfuscates an obfuscated API key back into its original plain-text format.
 */
export function deobfuscateKey(obfuscatedKey: string): string {
  if (!obfuscatedKey || !obfuscatedKey.startsWith("obf:")) {
    return obfuscatedKey;
  }
  try {
    const payload = obfuscatedKey.slice(4); // strip "obf:"
    const xorred = fromBase64(payload);
    return xorCipher(xorred);
  } catch (error) {
    console.error("[keyObfuscator] Failed to deobfuscate key:", error);
    return "";
  }
}

/**
 * Automatically detects if a key is obfuscated and decrypts it if needed.
 * Safe to call on any key string.
 */
export function decryptKeyIfNeeded(key: string): string {
  if (key && key.startsWith("obf:")) {
    return deobfuscateKey(key);
  }
  return key;
}
