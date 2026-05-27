#!/usr/bin/env node
/**
 * Sample scripture QA: known verses, PL/EN structure parity, encoding artifacts.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ALL_BOOK_SLUGS } from "./lib/bible-slugs.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const plPath = join(root, "assets/bible-full-pl.json");
const enPath = join(root, "assets/bible-full-en.json");

const pl = JSON.parse(readFileSync(plPath, "utf8"));
const en = JSON.parse(readFileSync(enPath, "utf8"));

const KNOWN_PL = {
  "genesis:1:1":
    "Na początku stworzył Bóg niebo i ziemię.",
  "john:3:16":
    "Albowiem tak Bóg umiłował świat, że Syna swego jednorodzonego dał, aby każdy, kto weń wierzy, nie zginął, ale miał żywot wieczny.",
  "psalms:23:1":
    "Psalm Dawidowy. Pan jest pasterzem moim, na niczem mi nie zejdzie.",
  "romans:8:28":
    "A wiemy, iż tym, którzy miłują Boga, wszystkie rzeczy dopomagają ku dobremu, to jest tym, którzy według postanowienia Bożego powołani są.",
};

const KNOWN_EN = {
  "genesis:1:1":
    "In the beginning God created the heaven and the earth.",
  "john:3:16":
    "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
  "psalms:23:1":
    "[A Psalm of David.] The LORD {is} my shepherd; I shall not want.",
  "romans:8:28":
    "And we know that all things work together for good to them that love God, to them who are the called according to {his} purpose.",
};

function bookMap(data) {
  return new Map(data.books.map((b) => [b.slug, b]));
}

function getVerse(data, slug, chapter, verse) {
  const book = bookMap(data).get(slug);
  if (!book) return undefined;
  const ch = book.chapters.find((c) => c.number === chapter);
  if (!ch) return undefined;
  return ch.verses.find((v) => v.number === verse)?.text;
}

function normalize(text) {
  return text?.replace(/\s+/g, " ").trim();
}

function chapterVerseCounts(book) {
  const chapters = {};
  for (const ch of book.chapters) {
    chapters[ch.number] = ch.verses.length;
  }
  return chapters;
}

function scanArtifacts(data, lang) {
  const issues = [];
  const mojibake = /[\uFFFD]|Ã.|Ä.|Å./;
  const htmlEntity = /&(?:amp|lt|gt|quot|#\d+);/;

  for (const book of data.books) {
    for (const ch of book.chapters) {
      const nums = ch.verses.map((v) => v.number);
      const dupes = nums.filter((n, i) => nums.indexOf(n) !== i);
      if (dupes.length) {
        issues.push({
          type: "duplicate-verse",
          lang,
          ref: `${book.slug}:${ch.number}`,
          detail: [...new Set(dupes)].join(", "),
        });
      }

      for (const v of ch.verses) {
        const text = v.text ?? "";
        if (!text.trim()) {
          issues.push({ type: "empty-verse", lang, ref: `${book.slug}:${ch.number}:${v.number}` });
        }
        if (mojibake.test(text)) {
          issues.push({ type: "mojibake", lang, ref: `${book.slug}:${ch.number}:${v.number}` });
        }
        if (htmlEntity.test(text)) {
          issues.push({ type: "html-entity", lang, ref: `${book.slug}:${ch.number}:${v.number}` });
        }
        if (/\[\.\.\.\]|\[\s*\]/.test(text)) {
          issues.push({ type: "placeholder-brackets", lang, ref: `${book.slug}:${ch.number}:${v.number}` });
        }
      }
    }
  }
  return issues;
}

console.log("=== Known verse spot-check ===\n");
let verseOk = 0;
let verseFail = 0;

for (const [key, expected] of Object.entries(KNOWN_PL)) {
  const [slug, ch, v] = key.split(":");
  const actual = normalize(getVerse(pl, slug, Number(ch), Number(v)));
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} PL ${key}`);
  if (!ok) {
    console.log(`  expected: ${expected}`);
    console.log(`  actual:   ${actual}`);
    verseFail++;
  } else verseOk++;
}

for (const [key, expected] of Object.entries(KNOWN_EN)) {
  const [slug, ch, v] = key.split(":");
  const actual = normalize(getVerse(en, slug, Number(ch), Number(v)));
  const ok = actual === expected;
  console.log(`${ok ? "PASS" : "FAIL"} EN ${key}`);
  if (!ok) {
    console.log(`  expected: ${expected}`);
    console.log(`  actual:   ${actual}`);
    verseFail++;
  } else verseOk++;
}

console.log(`\nSpot-check: ${verseOk} pass, ${verseFail} fail\n`);

console.log("=== Book slug & chapter structure (PL vs EN) ===\n");
const plBooks = bookMap(pl);
const enBooks = bookMap(en);
const structureIssues = [];

for (const slug of ALL_BOOK_SLUGS) {
  const pb = plBooks.get(slug);
  const eb = enBooks.get(slug);
  if (!pb) structureIssues.push({ slug, issue: "missing in PL" });
  if (!eb) structureIssues.push({ slug, issue: "missing in EN" });
  if (!pb || !eb) continue;

  if (pb.chapters.length !== eb.chapters.length) {
    structureIssues.push({
      slug,
      issue: "chapter count mismatch",
      pl: pb.chapters.length,
      en: eb.chapters.length,
    });
  }

  const plCounts = chapterVerseCounts(pb);
  const enCounts = chapterVerseCounts(eb);
  const allChapters = new Set([...Object.keys(plCounts), ...Object.keys(enCounts)]);

  for (const chNum of allChapters) {
    const plV = plCounts[chNum] ?? 0;
    const enV = enCounts[chNum] ?? 0;
    if (plV === 0 || enV === 0) {
      structureIssues.push({
        slug,
        issue: "missing chapter",
        chapter: Number(chNum),
        pl: plV,
        en: enV,
      });
      continue;
    }
    const max = Math.max(plV, enV);
    const diff = Math.abs(plV - enV);
    const pct = (diff / max) * 100;
    if (pct > 5) {
      structureIssues.push({
        slug,
        issue: "verse count >5% mismatch",
        chapter: Number(chNum),
        pl: plV,
        en: enV,
        pct: pct.toFixed(1),
      });
    }
  }
}

if (structureIssues.length === 0) {
  console.log("Structure parity OK for all 66 books.");
} else {
  const versificationOnly = structureIssues.every((s) => s.issue === "verse count >5% mismatch");
  console.log(`Structure issues: ${structureIssues.length}${versificationOnly ? " (expected KJV vs BG 1881 versification differences)" : ""}`);
  for (const s of structureIssues.slice(0, 30)) {
    console.log(JSON.stringify(s));
  }
  if (structureIssues.length > 30) console.log(`… and ${structureIssues.length - 30} more`);
}

console.log("\n=== Encoding / content artifacts ===\n");
const plArtifacts = scanArtifacts(pl, "pl");
const enArtifacts = scanArtifacts(en, "en");
const allArtifacts = [...plArtifacts, ...enArtifacts];
console.log(`Artifact scan: ${allArtifacts.length} issue(s)`);
const byType = {};
for (const a of allArtifacts) {
  byType[a.type] = (byType[a.type] ?? 0) + 1;
}
console.log("By type:", byType);
if (allArtifacts.length) {
  for (const a of allArtifacts.slice(0, 20)) {
    console.log(JSON.stringify(a));
  }
}

console.log("\n=== Summary ===");
console.log(
  JSON.stringify(
    {
      plBooks: pl.books.length,
      enBooks: en.books.length,
      plTranslation: pl.translationLabel,
      enTranslation: en.translationLabel,
      spotCheckPass: verseOk,
      spotCheckFail: verseFail,
      structureIssues: structureIssues.length,
      artifacts: allArtifacts.length,
    },
    null,
    2,
  ),
);

const hardStructureIssues = structureIssues.filter(
  (s) => s.issue !== "verse count >5% mismatch",
);

process.exit(verseFail > 0 || hardStructureIssues.length > 0 ? 1 : 0);
