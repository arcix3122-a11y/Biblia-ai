import type { SQLiteDatabase } from "expo-sqlite";
import type { BibleSeedFile, ScriptureTranslation } from "@/types/scripture";
import seedEn from "../../../assets/bible-seed-en.json";
import seedPl from "../../../assets/bible-seed-pl.json";

const englishSeed = seedEn as BibleSeedFile;
const polishSeed = seedPl as BibleSeedFile;

async function insertVerseBatch(
  db: SQLiteDatabase,
  chapterId: number,
  verses: { number: number; text: string }[],
  translation: ScriptureTranslation
): Promise<void> {
  for (let i = 0; i < verses.length; i += 100) {
    const batch = verses.slice(i, i + 100);
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

async function insertSeedBooks(
  db: SQLiteDatabase,
  enBooks: BibleSeedFile["books"],
  plBooks: BibleSeedFile["books"]
): Promise<void> {
  for (const book of enBooks) {
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

      await insertVerseBatch(db, chapterId, chapter.verses, "en");

      const plChapter = plBook?.chapters.find((entry) => entry.number === chapter.number);
      if (plChapter?.verses.length) {
        await insertVerseBatch(db, chapterId, plChapter.verses, "pl");
      }
    }
  }
}

export async function runSeedIfNeeded(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM books"
  );
  if (existing && existing.count > 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    await insertSeedBooks(db, englishSeed.books, polishSeed.books);
  });
}

/** Backfill Polish verses after schema v3 on devices that already had EN-only data. */
export async function runPolishSeedIfNeeded(db: SQLiteDatabase): Promise<void> {
  const plCount = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM verses WHERE translation = 'pl'"
  );
  if (plCount && plCount.count > 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (const plBook of polishSeed.books) {
      const bookRow = await db.getFirstAsync<{ id: number }>(
        "SELECT id FROM books WHERE slug = ?",
        plBook.slug
      );
      if (!bookRow) {
        continue;
      }

      for (const plChapter of plBook.chapters) {
        const chapterRow = await db.getFirstAsync<{ id: number }>(
          "SELECT id FROM chapters WHERE book_id = ? AND number = ?",
          bookRow.id,
          plChapter.number
        );
        if (!chapterRow) {
          continue;
        }

        await insertVerseBatch(db, chapterRow.id, plChapter.verses, "pl");
      }
    }
  });
}
