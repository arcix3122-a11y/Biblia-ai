import { getDatabase } from "./database";
import type { ReadingHistoryEntry } from "@/types/scripture";

export async function recordReading(
  bookId: number,
  chapter: number,
  verse: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO reading_history (book_id, chapter, verse) VALUES (?, ?, ?)`,
    bookId,
    chapter,
    verse
  );
}

export async function getRecentHistory(limit = 20): Promise<ReadingHistoryEntry[]> {
  const db = await getDatabase();
  return db.getAllAsync<ReadingHistoryEntry>(
    `SELECT h.id, h.book_id, h.chapter, h.verse, h.viewed_at,
            b.name AS book_name, b.slug AS book_slug
     FROM reading_history h
     INNER JOIN books b ON b.id = h.book_id
     ORDER BY h.viewed_at DESC
     LIMIT ?`,
    limit
  );
}

export async function getLastReadPosition(): Promise<ReadingHistoryEntry | null> {
  const db = await getDatabase();
  return db.getFirstAsync<ReadingHistoryEntry>(
    `SELECT h.id, h.book_id, h.chapter, h.verse, h.viewed_at,
            b.name AS book_name, b.slug AS book_slug
     FROM reading_history h
     INNER JOIN books b ON b.id = h.book_id
     ORDER BY h.viewed_at DESC
     LIMIT 1`
  );
}
