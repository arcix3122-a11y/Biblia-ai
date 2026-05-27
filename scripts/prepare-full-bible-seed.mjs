#!/usr/bin/env node
/**
 * Build full bundled Bible assets for EN (KJV) and PL (Biblia Gdańska 1881).
 *
 * Outputs:
 *   assets/bible-full-en.json
 *   assets/bible-full-pl.json
 *
 * If either file exceeds 15 MB, also writes a .json.gz companion (app loads gzip on device).
 *
 * Usage:
 *   node scripts/prepare-full-bible-seed.mjs
 *   node scripts/prepare-full-bible-seed.mjs --skip-pl   # EN only (offline)
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { countVerses } from "./lib/bible-slugs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const assets = path.join(root, "assets");
const enTarget = path.join(assets, "bible-full-en.json");
const plTarget = path.join(assets, "bible-full-pl.json");
const MAX_COMMIT_BYTES = 15 * 1024 * 1024;

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

const skipPl = process.argv.includes("--skip-pl");

function maybeGzip(jsonPath) {
  const bytes = fs.statSync(jsonPath).size;
  if (bytes <= MAX_COMMIT_BYTES) {
    console.log(`  ${path.basename(jsonPath)}: ${bytes} bytes — commit plain JSON`);
    return { path: jsonPath, bytes, gzipped: false };
  }
  const gzPath = `${jsonPath}.gz`;
  const compressed = zlib.gzipSync(fs.readFileSync(jsonPath));
  fs.writeFileSync(gzPath, compressed);
  console.warn(
    `  ${path.basename(jsonPath)}: ${bytes} bytes exceeds 15 MB — wrote ${path.basename(gzPath)} (${compressed.length} bytes)`
  );
  return { path: jsonPath, gzPath, bytes, gzBytes: compressed.length, gzipped: true };
}

console.log("Step 1/2 — English KJV from scripts/source-kjv-full.json");
const convertScript = path.join(__dirname, "convert-kjv-source.mjs");
const enResult = spawnSync(process.execPath, [convertScript, "--output", enTarget], {
  stdio: "inherit",
});
if (enResult.status !== 0) {
  process.exit(enResult.status ?? 1);
}

let plInfo = null;
if (!skipPl) {
  console.log("");
  console.log("Step 2/2 — Polish Biblia Gdańska via midvash/bible-data (66 books, network)");
  const importScript = path.join(__dirname, "import-polish-bible.mjs");
  const plResult = spawnSync(
    process.execPath,
    [importScript, "--midvash", "--full", "--output", plTarget],
    { stdio: "inherit" }
  );
  if (plResult.status !== 0) {
    process.exit(plResult.status ?? 1);
  }
  plInfo = maybeGzip(plTarget);
} else {
  console.log("Step 2/2 — skipped (--skip-pl)");
}

const enInfo = maybeGzip(enTarget);
const enData = JSON.parse(fs.readFileSync(enTarget, "utf8"));
const plData = fs.existsSync(plTarget) ? JSON.parse(fs.readFileSync(plTarget, "utf8")) : null;

console.log("");
console.log("Full Bible seed summary:");
console.log(`  EN: ${enData.books.length} books, ${countVerses(enData)} verses`);
if (plData) {
  console.log(`  PL: ${plData.books.length} books, ${countVerses(plData)} verses`);
}
console.log("");
console.log("Next: commit assets/bible-full-*.json (and .gz if present), then reinstall app.");
console.log("Clear @biblia-ai/full-bible-imported-v1 or Settings → Clear library to re-seed.");

export { enInfo, plInfo };
