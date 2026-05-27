import { getDatabase } from "./database";
import type { Bookmark, ScriptureTranslation } from "@/types/scripture";

export async function listBookmarks(
  translation: ScriptureTranslation = "en"
): Promise<Bookmark[]> {
  const db = await getDatabase();
  return db.getAllAsync<Bookmark>(
    `SELECT b.id, b.verse_id, b.book_id, b.chapter, b.verse, b.created_at, b.note,
            bk.name AS book_name, bk.slug AS book_slug,
            COALESCE(vt.text, v.text) AS verse_text
     FROM bookmarks b
     INNER JOIN books bk ON bk.id = b.book_id
     INNER JOIN verses v ON v.id = b.verse_id
     LEFT JOIN chapters c ON c.book_id = b.book_id AND c.number = b.chapter
     LEFT JOIN verses vt ON vt.chapter_id = c.id AND vt.number = b.verse AND vt.translation = ?
     ORDER BY b.created_at DESC`,
    translation
  );
}

export async function findBookmarkByVerseId(verseId: number): Promise<Bookmark | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Bookmark>(
    `SELECT id, verse_id, book_id, chapter, verse, created_at, note
     FROM bookmarks WHERE verse_id = ?`,
    verseId
  );
}

export async function addBookmark(
  verseId: number,
  bookId: number,
  chapter: number,
  verse: number,
  note?: string
): Promise<Bookmark> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO bookmarks (verse_id, book_id, chapter, verse, note)
     VALUES (?, ?, ?, ?, ?)`,
    verseId,
    bookId,
    chapter,
    verse,
    note ?? null
  );
  const id = result.lastInsertRowId;
  const row = await db.getFirstAsync<Bookmark>(
    `SELECT id, verse_id, book_id, chapter, verse, created_at, note FROM bookmarks WHERE id = ?`,
    id
  );
  if (!row) {
    throw new Error("Failed to create bookmark");
  }
  return row;
}

export async function removeBookmark(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM bookmarks WHERE id = ?`, id);
}

export async function removeBookmarkByVerseId(verseId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM bookmarks WHERE verse_id = ?`, verseId);
}
