#!/usr/bin/env node
/**
 * Convert Thayer-style KJV JSON (scripts/source-kjv-full.json) to app seed shape.
 * Source: public-domain KJV array [{ abbrev, chapters: [[verse strings]] }]
 *
 * Usage:
 *   node scripts/convert-kjv-source.mjs
 *   node scripts/convert-kjv-source.mjs --output assets/bible-full-en.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BOOK_META, KJV_ABBREV_TO_SLUG, countVerses } from "./lib/bible-slugs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const defaultSource = path.join(root, "scripts", "source-kjv-full.json");
const defaultOutput = path.join(root, "assets", "bible-full-en.json");

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { source: defaultSource, output: defaultOutput };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--output" && argv[i + 1]) {
      args.output = path.resolve(argv[++i]);
    } else if (arg === "--source" && argv[i + 1]) {
      args.source = path.resolve(argv[++i]);
    } else if (!arg.startsWith("-")) {
      args.source = path.resolve(arg);
    }
  }
  return args;
}

function readJson(pathname) {
  const raw = fs.readFileSync(pathname, "utf8").replace(/^\uFEFF/, "");
  try {
    return JSON.parse(raw);
  } catch {
    fail(`Invalid JSON: ${pathname}`);
  }
}

function convertThayerBook(entry, orderIndex) {
  const slug = KJV_ABBREV_TO_SLUG[entry.abbrev];
  if (!slug) {
    fail(`Unknown KJV abbrev: ${entry.abbrev}`);
  }
  const meta = BOOK_META[slug];
  if (!meta) {
    fail(`No BOOK_META for slug ${slug}`);
  }
  const chapters = (entry.chapters ?? []).map((verseTexts, index) => ({
    number: index + 1,
    verses: (verseTexts ?? []).map((text, verseIndex) => ({
      number: verseIndex + 1,
      text: String(text ?? "").trim(),
    })),
  }));
  return {
    testament: meta.testament,
    name: meta.name,
    slug,
    order_index: orderIndex,
    chapter_count: meta.chapter_count,
    chapters,
  };
}

const args = parseArgs(process.argv);
if (!fs.existsSync(args.source)) {
  fail(`Source not found: ${args.source}`);
}

const source = readJson(args.source);
if (!Array.isArray(source)) {
  fail("Expected root array of { abbrev, chapters } entries");
}

const books = source.map((entry, index) => convertThayerBook(entry, index + 1));
const seed = {
  version: 2,
  translation: "en",
  translationLabel: "King James Version",
  license: "public-domain",
  source: "scripts/source-kjv-full.json (Thayer KJV export)",
  books,
};

fs.mkdirSync(path.dirname(args.output), { recursive: true });
fs.writeFileSync(args.output, `${JSON.stringify(seed)}\n`, "utf8");

const bytes = fs.statSync(args.output).size;
console.log(`Wrote ${args.output}`);
console.log(`${books.length} books, ${countVerses(seed)} verses (${bytes} bytes, ${(bytes / 1_048_576).toFixed(2)} MB)`);
