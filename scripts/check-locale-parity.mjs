#!/usr/bin/env node
/**
 * Compare key paths in en.json vs pl.json.
 * Exit 0 when both locales define the same keys; exit 1 and list gaps otherwise.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const enPath = join(root, "src/i18n/locales/en.json");
const plPath = join(root, "src/i18n/locales/pl.json");

function collectPaths(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, nested]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    if (nested !== null && typeof nested === "object" && !Array.isArray(nested)) {
      return collectPaths(nested, next);
    }
    return [next];
  });
}

const en = JSON.parse(readFileSync(enPath, "utf8").replace(/^\uFEFF/, ""));
const pl = JSON.parse(readFileSync(plPath, "utf8").replace(/^\uFEFF/, ""));

const enPaths = new Set(collectPaths(en));
const plPaths = new Set(collectPaths(pl));

const missingInPl = [...enPaths].filter((key) => !plPaths.has(key)).sort();
const missingInEn = [...plPaths].filter((key) => !enPaths.has(key)).sort();

if (missingInPl.length === 0 && missingInEn.length === 0) {
  console.log(`Locale parity OK (${enPaths.size} keys in en.json / pl.json).`);
  process.exit(0);
}

console.error("Locale parity check failed.\n");

if (missingInPl.length > 0) {
  console.error(`Missing in pl.json (${missingInPl.length}):`);
  for (const key of missingInPl) {
    console.error(`  - ${key}`);
  }
  console.error("");
}

if (missingInEn.length > 0) {
  console.error(`Missing in en.json (${missingInEn.length}):`);
  for (const key of missingInEn) {
    console.error(`  - ${key}`);
  }
  console.error("");
}

process.exit(1);
