/**
 * Full Bible import validator (offline tooling)
 *
 * Expects JSON with the same nested shape as assets/bible-seed.json:
 * { version, translation, books: [{ testament, name, slug, order_index, chapter_count, chapters: [...] }] }
 *
 * Usage:
 *   node scripts/import-full-bible.mjs path/to/bible-export.json
 *
 * To install into the app bundle:
 *   node scripts/prepare-bible-seed.mjs path/to/bible-export.json
 *   (copies validated JSON to assets/bible-seed.json)
 *
 * After replacing seed data, clear app storage or reinstall so SQLite re-seeds.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/import-full-bible.mjs <bible.json>");
  console.error("See README.md — Full Bible import");
  process.exit(1);
}

const absolute = path.resolve(inputPath);
let data;
try {
  data = JSON.parse(readFileSync(absolute, "utf8"));
} catch (error) {
  console.error(`Failed to parse JSON (${absolute}):`, error instanceof Error ? error.message : error);
  process.exit(1);
}

if (!data || typeof data !== "object" || !Array.isArray(data.books)) {
  console.error('Invalid Bible JSON: root must include a "books" array');
  process.exit(1);
}

let books = 0;
let chapters = 0;
let verses = 0;
const slugs = new Set();

for (const book of data.books) {
  if (!book.slug || !book.name || !book.testament) {
    console.error(`Invalid book entry (missing slug, name, or testament):`, book);
    process.exit(1);
  }
  if (slugs.has(book.slug)) {
    console.error(`Duplicate book slug: ${book.slug}`);
    process.exit(1);
  }
  slugs.add(book.slug);
  books += 1;
  for (const chapter of book.chapters ?? []) {
    chapters += 1;
    const chapterVerses = chapter.verses ?? [];
    if (chapterVerses.length === 0) {
      console.warn(`Warning: ${book.slug} chapter ${chapter.number} has no verses`);
    }
    verses += chapterVerses.length;
  }
}

console.log(`File: ${absolute}`);
console.log(`Validated: ${books} books, ${chapters} chapters, ${verses} verses`);
console.log(`Translation: ${data.translation ?? "unknown"} · schema version: ${data.version ?? "?"}`);
console.log("");
console.log("Next step: node scripts/prepare-bible-seed.mjs", inputPath);
