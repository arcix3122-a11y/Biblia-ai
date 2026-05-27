#!/usr/bin/env node
/**
 * Convert a Polish Bible JSON export into app seed shape (Biblia Gdańska 1881, public domain).
 *
 * Supported inputs:
 * 1. midvash/bible-data book files (fetch via --midvash, or local dir)
 * 2. App-shaped JSON with books[].chapters[].verses[]
 * 3. Bible SuperSearch polbg.json (books keyed by OSIS abbreviations)
 *
 * Usage:
 *   node scripts/import-polish-bible.mjs --midvash
 *   node scripts/import-polish-bible.mjs ./path/to/polish-full.json
 *   node scripts/import-polish-bible.mjs --midvash --output assets/bible-seed-pl-full.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BOOK_META,
  MIDVASH_BOOK_FILES,
  MOBILE_SLICES,
  countVerses,
  pickMobileSlices,
} from "./lib/bible-slugs.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const defaultOut = path.join(root, "assets", "bible-seed-pl.json");

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { midvash: false, output: defaultOut, input: null, full: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--midvash") {
      args.midvash = true;
    } else if (arg === "--full") {
      args.full = true;
    } else if (arg === "--output" && argv[i + 1]) {
      args.output = path.resolve(argv[++i]);
    } else if (!arg.startsWith("-")) {
      args.input = path.resolve(arg);
    }
  }
  return args;
}

async function fetchMidvashBook(fileStem) {
  const rawUrl = `https://raw.githubusercontent.com/midvash/bible-data/main/versions/pl/bg/books/${fileStem}.json`;
  const response = await fetch(rawUrl);
  if (!response.ok) {
    fail(`Fetch failed for ${fileStem}: HTTP ${response.status} (${rawUrl})`);
  }
  return response.json();
}

function midvashChapterToVerses(chapter) {
  if (Array.isArray(chapter?.verses)) {
    return chapter.verses.map((verse, index) => ({
      number: verse.number ?? index + 1,
      text: String(verse.text ?? "").trim(),
    }));
  }
  if (chapter && typeof chapter === "object") {
    return Object.entries(chapter)
      .filter(([key]) => /^\d+$/.test(key))
      .map(([key, value]) => ({
        number: Number(key),
        text: typeof value === "string" ? value.trim() : String(value?.text ?? "").trim(),
      }))
      .sort((a, b) => a.number - b.number);
  }
  return [];
}

function midvashBookToSeedBook(slug, midvashBook) {
  const meta = BOOK_META[slug];
  if (!meta) {
    fail(`No BOOK_META for slug ${slug}`);
  }
  const chapters = (midvashBook.chapters ?? []).map((chapter, index) => ({
    number: chapter.number ?? index + 1,
    verses: midvashChapterToVerses(chapter),
  }));
  return {
    testament: meta.testament,
    name: meta.name,
    slug,
    order_index: meta.order_index,
    chapter_count: meta.chapter_count,
    chapters,
  };
}

async function loadFromMidvash(full) {
  const slugs = full ? Object.keys(MIDVASH_BOOK_FILES) : [...new Set(MOBILE_SLICES.map((s) => s.slug))];
  const books = [];
  for (const slug of slugs) {
    const fileStem = MIDVASH_BOOK_FILES[slug];
    if (!fileStem) {
      fail(`No midvash mapping for ${slug}`);
    }
    console.log(`Fetching pl/bg/${fileStem}.json …`);
    const midvashBook = await fetchMidvashBook(fileStem);
    books.push(midvashBookToSeedBook(slug, midvashBook));
  }
  return {
    version: 2,
    translation: "pl",
    translationLabel: "Biblia Gdańska (1881)",
    license: "public-domain",
    source: "https://github.com/midvash/bible-data/tree/main/versions/pl/bg",
    books,
  };
}

function normalizeAppShape(data) {
  if (!data?.books?.length) {
    fail('Input JSON must include a non-empty "books" array');
  }
  return {
    version: data.version ?? 2,
    translation: data.translation ?? "pl",
    translationLabel: data.translationLabel ?? "Biblia Gdańska (1881)",
    license: data.license ?? "public-domain",
    source: data.source ?? "unknown",
    books: data.books,
  };
}

const args = parseArgs(process.argv);

let seed;
if (args.midvash) {
  seed = await loadFromMidvash(args.full);
} else if (args.input) {
  if (!fs.existsSync(args.input)) {
    fail(`File not found: ${args.input}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(args.input, "utf8"));
  } catch {
    fail("Invalid JSON input");
  }
  seed = normalizeAppShape(parsed);
} else {
  fail("Provide --midvash or a source JSON path");
}

if (!args.full && !args.output.includes("full")) {
  seed = {
    ...seed,
    books: pickMobileSlices(seed, MOBILE_SLICES),
  };
}

fs.mkdirSync(path.dirname(args.output), { recursive: true });
fs.writeFileSync(args.output, `${JSON.stringify(seed, null, 2)}\n`, "utf8");

console.log(`Wrote ${args.output}`);
console.log(`${seed.books.length} books, ${countVerses(seed)} verses (${fs.statSync(args.output).size} bytes)`);
console.log("Next: node scripts/prepare-bilingual-seed.mjs");
