import type { SQLiteDatabase } from "expo-sqlite";
import type { BibleSeedFile, ScriptureTranslation } from "@/types/scripture";
import seedEn from "../../../assets/bible-full-en.json";
import seedPl from "../../../assets/bible-full-pl.json";
import { useSeedProgressStore } from "@/store/seedProgressStore";

const englishSeed = seedEn as BibleSeedFile;
const polishSeed = seedPl as BibleSeedFile;

const VERSE_BATCH_SIZE = 750;
const FULL_BIBLE_BOOK_COUNT = 66;
const FULL_BIBLE_VERSE_FLOOR = 30_000;

export type SeedProgressCallback = (percent: number, phase: string) => void;

function reportProgress(percent: number, phase: SeedProgressCallback extends never ? never : string): void {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  useSeedProgressStore.getState().setProgress({
    active: true,
    phase: phase === "books" ? "books" : "verses",
    percent: clamped,
    messageKey: "common.scriptureImportProgress",
  });
}

async function applyBulkPragmas(db: SQLiteDatabase): Promise<void> {
  const pragmas = [
    "PRAGMA journal_mode = WAL;",
    "PRAGMA synchronous = NORMAL;",
    "PRAGMA temp_store = MEMORY;",
    "PRAGMA cache_size = -64000;",
    "PRAGMA foreign_keys = ON;",
  ];
  for (const pragma of pragmas) {
    try {
      await db.execAsync(pragma);
    } catch {
      // Some PRAGMA values are unsupported on certain platforms.
    }
  }
}

async function insertVerseBatch(
  db: SQLiteDatabase,
  chapterId: number,
  verses: { number: number; text: string }[],
  translation: ScriptureTranslation
): Promise<void> {
  for (let i = 0; i < verses.length; i += VERSE_BATCH_SIZE) {
    const batch = verses.slice(i, i + VERSE_BATCH_SIZE);
    const placeholders = batch.map(() => "(?, ?, ?, ?)").join(", ");
    const params: Array<number | string> = [];
    for (const verse of batch) {
      params.push(chapterId, verse.number, translation, verse.text);
    }
    await db.runAsync(
      `INSERT INTO verses (chapter_id, number, translation, text) VALUES ${placeholders}`,
      ...params
    );
  }
}

function countSeedVerses(enBooks: BibleSeedFile["books"], plBooks: BibleSeedFile["books"]): number {
  let total = 0;
  for (const book of enBooks) {
    for (const chapter of book.chapters) {
      total += chapter.verses.length;
    }
  }
  for (const book of plBooks) {
    for (const chapter of book.chapters) {
      total += chapter.verses.length;
    }
  }
  return total;
}

async function insertSeedBooks(
  db: SQLiteDatabase,
  enBooks: BibleSeedFile["books"],
  plBooks: BibleSeedFile["books"],
  onProgress?: SeedProgressCallback
): Promise<void> {
  const totalVerses = countSeedVerses(enBooks, plBooks);
  let insertedVerses = 0;

  const bump = (phase: string) => {
    const percent = 5 + (insertedVerses / totalVerses) * 90;
    reportProgress(percent, phase);
    onProgress?.(percent, phase);
  };

  reportProgress(2, "books");
  onProgress?.(2, "books");

  for (let bookIndex = 0; bookIndex < enBooks.length; bookIndex += 1) {
    const book = enBooks[bookIndex];
    const bookResult = await db.runAsync(
      `INSERT INTO books (testament, name, slug, chapter_count, order_index)
       VALUES (?, ?, ?, ?, ?)`,
      book.testament,
      book.name,
      book.slug,
      book.chapter_count,
      book.order_index
    );
    const bookId = bookResult.lastInsertRowId;
    const plBook = plBooks.find((entry) => entry.slug === book.slug);

    for (const chapter of book.chapters) {
      const chapterResult = await db.runAsync(
        `INSERT INTO chapters (book_id, number) VALUES (?, ?)`,
        bookId,
        chapter.number
      );
      const chapterId = chapterResult.lastInsertRowId;

      const plChapter = plBook?.chapters.find((entry) => entry.number === chapter.number);

      await db.withTransactionAsync(async () => {
        await insertVerseBatch(db, chapterId, chapter.verses, "en");
        if (plChapter?.verses.length) {
          await insertVerseBatch(db, chapterId, plChapter.verses, "pl");
        }
      });
      insertedVerses += chapter.verses.length;
      if (plChapter?.verses.length) {
        insertedVerses += plChapter.verses.length;
      }
      bump("verses");
    }

    const bookPercent = 5 + ((bookIndex + 1) / enBooks.length) * 5;
    reportProgress(bookPercent, "books");
  }

  reportProgress(100, "done");
  onProgress?.(100, "done");
}

export async function needsFullBibleSeed(db: SQLiteDatabase): Promise<boolean> {
  const bookRow = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM books"
  );
  if ((bookRow?.count ?? 0) < FULL_BIBLE_BOOK_COUNT) {
    return true;
  }

  const enRow = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM verses WHERE translation = 'en'"
  );
  const plRow = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM verses WHERE translation = 'pl'"
  );

  return (
    (enRow?.count ?? 0) < FULL_BIBLE_VERSE_FLOOR ||
    (plRow?.count ?? 0) < FULL_BIBLE_VERSE_FLOOR
  );
}

export async function runFullBibleSeed(
  db: SQLiteDatabase,
  onProgress?: SeedProgressCallback
): Promise<void> {
  useSeedProgressStore.getState().setProgress({
    active: true,
    phase: "preparing",
    percent: 0,
    messageKey: "common.scriptureImportTitle",
    error: null,
  });
  onProgress?.(0, "preparing");

  await applyBulkPragmas(db);

  await db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM verses;");
    await db.execAsync("DELETE FROM chapters;");
    await db.execAsync("DELETE FROM books;");
  });

  await insertSeedBooks(db, englishSeed.books, polishSeed.books, onProgress);

  useSeedProgressStore.getState().setProgress({
    active: false,
    phase: "done",
    percent: 100,
    messageKey: null,
  });
}

/** @deprecated Use runFullBibleSeed — kept for migration backfill only. */
export async function runSeedIfNeeded(db: SQLiteDatabase): Promise<void> {
  if (!(await needsFullBibleSeed(db))) {
    return;
  }
  await runFullBibleSeed(db);
}

/** Backfill Polish verses after schema v3 on devices that already had EN-only data. */
export async function runPolishSeedIfNeeded(db: SQLiteDatabase): Promise<void> {
  const plCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM verses WHERE translation = 'pl'"
  );
  if (plCount && plCount.count >= FULL_BIBLE_VERSE_FLOOR) {
    return;
  }

  if (await needsFullBibleSeed(db)) {
    await runFullBibleSeed(db);
  }
}

export function getBundledSeedStats(): {
  enBooks: number;
  plBooks: number;
  enVerses: number;
  plVerses: number;
} {
  const enVerses = englishSeed.books.reduce(
    (total, book) =>
      total + book.chapters.reduce((sum, chapter) => sum + chapter.verses.length, 0),
    0
  );
  const plVerses = polishSeed.books.reduce(
    (total, book) =>
      total + book.chapters.reduce((sum, chapter) => sum + chapter.verses.length, 0),
    0
  );
  return {
    enBooks: englishSeed.books.length,
    plBooks: polishSeed.books.length,
    enVerses,
    plVerses,
  };
}
