import type { SQLiteDatabase } from "expo-sqlite";
import type { BibleSeedFile } from "@/types/scripture";
import seedData from "../../../assets/bible-seed.json";

const bibleSeed = seedData as BibleSeedFile;

export async function runSeedIfNeeded(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM books"
  );
  if (existing && existing.count > 0) {
    return;
  }

  await db.withTransactionAsync(async () => {
    for (const book of bibleSeed.books) {
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

      for (const chapter of book.chapters) {
        const chapterResult = await db.runAsync(
          `INSERT INTO chapters (book_id, number) VALUES (?, ?)`,
          bookId,
          chapter.number
        );
        const chapterId = chapterResult.lastInsertRowId;

        for (const verse of chapter.verses) {
          await db.runAsync(
            `INSERT INTO verses (chapter_id, number, text) VALUES (?, ?, ?)`,
            chapterId,
            verse.number,
            verse.text
          );
        }
      }
    }
  });
}
