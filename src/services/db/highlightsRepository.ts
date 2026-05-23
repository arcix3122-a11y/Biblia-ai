import type { HighlightColor, VerseHighlight } from "@/types/scripture";
import { getDatabase } from "./database";

export interface HighlightWithReference extends VerseHighlight {
  book_slug: string;
  chapter: number;
  verse: number;
}

export async function listHighlights(): Promise<VerseHighlight[]> {
  const db = await getDatabase();
  return db.getAllAsync<VerseHighlight>(
    `SELECT id, verse_id, color, created_at FROM verse_highlights ORDER BY created_at DESC`
  );
}

export async function findHighlightByVerseId(
  verseId: number
): Promise<VerseHighlight | null> {
  const db = await getDatabase();
  return db.getFirstAsync<VerseHighlight>(
    `SELECT id, verse_id, color, created_at FROM verse_highlights WHERE verse_id = ?`,
    verseId
  );
}

export async function setVerseHighlight(
  verseId: number,
  color: HighlightColor
): Promise<VerseHighlight> {
  const db = await getDatabase();
  const existing = await findHighlightByVerseId(verseId);

  if (existing) {
    await db.runAsync(`UPDATE verse_highlights SET color = ? WHERE id = ?`, color, existing.id);
    return { ...existing, color };
  }

  const result = await db.runAsync(
    `INSERT INTO verse_highlights (verse_id, color) VALUES (?, ?)`,
    verseId,
    color
  );

  const inserted = await db.getFirstAsync<VerseHighlight>(
    `SELECT id, verse_id, color, created_at FROM verse_highlights WHERE id = ?`,
    result.lastInsertRowId
  );

  if (!inserted) {
    throw new Error("Failed to insert verse highlight");
  }

  return inserted;
}

export async function listHighlightsWithReferences(): Promise<HighlightWithReference[]> {
  const db = await getDatabase();
  return db.getAllAsync<HighlightWithReference>(
    `SELECT h.id, h.verse_id, h.color, h.created_at,
            b.slug AS book_slug, c.number AS chapter, v.number AS verse
     FROM verse_highlights h
     INNER JOIN verses v ON v.id = h.verse_id
     INNER JOIN chapters c ON c.id = v.chapter_id
     INNER JOIN books b ON b.id = c.book_id
     ORDER BY h.created_at DESC`
  );
}

export async function findVerseIdByReference(
  bookSlug: string,
  chapter: number,
  verse: number
): Promise<number | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ id: number }>(
    `SELECT v.id
     FROM verses v
     INNER JOIN chapters c ON c.id = v.chapter_id
     INNER JOIN books b ON b.id = c.book_id
     WHERE b.slug = ? AND c.number = ? AND v.number = ?`,
    bookSlug,
    chapter,
    verse
  );
  return row?.id ?? null;
}

export async function findHighlightReferenceByVerseId(
  verseId: number
): Promise<HighlightWithReference | null> {
  const db = await getDatabase();
  return db.getFirstAsync<HighlightWithReference>(
    `SELECT h.id, h.verse_id, h.color, h.created_at,
            b.slug AS book_slug, c.number AS chapter, v.number AS verse
     FROM verse_highlights h
     INNER JOIN verses v ON v.id = h.verse_id
     INNER JOIN chapters c ON c.id = v.chapter_id
     INNER JOIN books b ON b.id = c.book_id
     WHERE h.verse_id = ?`,
    verseId
  );
}

export async function removeVerseHighlight(verseId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM verse_highlights WHERE verse_id = ?`, verseId);
}
