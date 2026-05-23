import type { HighlightColor, VerseHighlight } from "@/types/scripture";
import { getDatabase } from "./database";

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

export async function removeVerseHighlight(verseId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM verse_highlights WHERE verse_id = ?`, verseId);
}
