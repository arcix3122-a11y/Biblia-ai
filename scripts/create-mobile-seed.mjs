#!/usr/bin/env node
/**
 * Build the bundled mobile-first seed from a full Bible JSON export.
 * Keeps only: Genesis 1, Psalms 23, John 1, Romans 8:26-31.
 *
 * Usage:
 *   node scripts/create-mobile-seed.mjs [path/to/full-bible.json]
 *
 * Defaults to assets/bible-seed.json as input when a full export is present,
 * or scripts/source-kjv-full.json if available.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const target = path.join(root, "assets", "bible-seed.json");

const SLICES = [
  { slug: "genesis", chapter: 1 },
  { slug: "psalms", chapter: 23 },
  { slug: "john", chapter: 1 },
  { slug: "romans", chapter: 8, verses: [26, 31] },
];

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function resolveInputPath() {
  const arg = process.argv[2];
  if (arg) {
    return path.resolve(arg);
  }
  const candidates = [
    path.join(root, "scripts", "source-kjv-full.json"),
    target,
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  fail(
    "Provide a full Bible JSON path: node scripts/create-mobile-seed.mjs <file.json>"
  );
}

function pickBookSlice(source, { slug, chapter, verses }) {
  const book = source.books.find((entry) => entry.slug === slug);
  if (!book) {
    fail(`Book not found in source: ${slug}`);
  }
  const chapterEntry = book.chapters.find((entry) => entry.number === chapter);
  if (!chapterEntry) {
    fail(`Chapter ${chapter} not found in ${slug}`);
  }
  let selectedVerses = chapterEntry.verses;
  if (verses) {
    const [from, to] = verses;
    selectedVerses = chapterEntry.verses.filter(
      (verse) => verse.number >= from && verse.number <= to
    );
    if (selectedVerses.length === 0) {
      fail(`No verses ${from}-${to} in ${slug} ${chapter}`);
    }
  }
  return {
    testament: book.testament,
    name: book.name,
    slug: book.slug,
    order_index: book.order_index,
    chapter_count: book.chapter_count,
    chapters: [{ number: chapter, verses: selectedVerses }],
  };
}

const inputPath = resolveInputPath();
let source;
try {
  source = JSON.parse(fs.readFileSync(inputPath, "utf8"));
} catch {
  fail(`Invalid JSON: ${inputPath}`);
}

if (!source?.books?.length) {
  fail('Source JSON must include a non-empty "books" array');
}

const output = {
  version: source.version ?? 1,
  translation: source.translation ?? "KJV",
  books: SLICES.map((slice) => pickBookSlice(source, slice)),
};

fs.writeFileSync(target, `${JSON.stringify(output, null, 2)}\n`, "utf8");

const verseCount = output.books.reduce(
  (total, book) =>
    total + book.chapters.reduce((sum, ch) => sum + ch.verses.length, 0),
  0
);

console.log(`Wrote ${target}`);
console.log(`${output.books.length} books, ${verseCount} verses (${fs.statSync(target).size} bytes)`);
console.log("Reinstall the app or clear @biblia-ai/db-seeded to re-import.");
