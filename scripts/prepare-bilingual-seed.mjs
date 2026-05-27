#!/usr/bin/env node
/**
 * Build bundled mobile seeds for EN (KJV) and PL (Biblia Gdańska 1881).
 * Copies EN from existing bible-seed.json → bible-seed-en.json, generates PL via import-polish-bible.
 *
 * Usage:
 *   node scripts/prepare-bilingual-seed.mjs
 *   node scripts/prepare-bilingual-seed.mjs --en ./full-kjv.json
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { countVerses, pickMobileSlices, MOBILE_SLICES } from "./lib/bible-slugs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const assets = path.join(root, "assets");
const enTarget = path.join(assets, "bible-seed-en.json");
const plTarget = path.join(assets, "bible-seed-pl.json");
const legacyTarget = path.join(assets, "bible-seed.json");

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const enSourceArg = process.argv.find((arg, i) => process.argv[i - 1] === "--en");
const enSource = enSourceArg
  ? path.resolve(enSourceArg)
  : fs.existsSync(legacyTarget)
    ? legacyTarget
    : fail("No EN source — provide --en or ensure assets/bible-seed.json exists");

let enData;
try {
  enData = JSON.parse(fs.readFileSync(enSource, "utf8"));
} catch {
  fail(`Invalid EN JSON: ${enSource}`);
}

const enMobile = {
  version: 2,
  translation: "en",
  translationLabel: "King James Version",
  license: "public-domain",
  source: enData.source ?? "KJV",
  books: pickMobileSlices(enData, MOBILE_SLICES),
};

fs.writeFileSync(enTarget, `${JSON.stringify(enMobile, null, 2)}\n`, "utf8");
console.log(`Wrote ${enTarget} — ${countVerses(enMobile)} verses`);

const importScript = path.join(__dirname, "import-polish-bible.mjs");
const result = spawnSync(process.execPath, [importScript, "--midvash", "--output", plTarget], {
  stdio: "inherit",
});
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const plData = JSON.parse(fs.readFileSync(plTarget, "utf8"));
const totalBytes = fs.statSync(enTarget).size + fs.statSync(plTarget).size;

console.log("");
console.log("Bilingual mobile seed summary:");
console.log(`  EN: ${countVerses(enMobile)} verses (${fs.statSync(enTarget).size} bytes)`);
console.log(`  PL: ${countVerses(plData)} verses (${fs.statSync(plTarget).size} bytes)`);
console.log(`  Total: ${totalBytes} bytes (limit 500KB)`);
if (totalBytes > 500_000) {
  console.warn("Warning: combined seed exceeds 500KB mobile budget");
}

console.log("");
console.log("Legacy bible-seed.json kept for compatibility; seed.ts loads bible-seed-en.json + bible-seed-pl.json.");
console.log("Reinstall app or clear @biblia-ai/db-seeded to re-import SQLite.");
