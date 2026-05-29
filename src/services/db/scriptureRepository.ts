import { getDatabase, isFullBibleImported as isFullBibleImportedFlag } from "./database";
import type {
  Book,
  Chapter,
  ScriptureTranslation,
  Testament,
  Verse,
  VerseWithReference,
} from "@/types/scripture";

const FULL_BIBLE_BOOK_COUNT = 66;

export async function getBooksByTestament(testament: Testament): Promise<Book[]> {
  const db = await getDatabase();
  return db.getAllAsync<Book>(
    `SELECT id, testament, name, slug, chapter_count, order_index
     FROM books WHERE testament = ? ORDER BY order_index ASC`,
    testament
  );
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Book>(
    `SELECT id, testament, name, slug, chapter_count, order_index
     FROM books WHERE slug = ?`,
    slug
  );
}

export async function getBookById(id: number): Promise<Book | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Book>(
    `SELECT id, testament, name, slug, chapter_count, order_index
     FROM books WHERE id = ?`,
    id
  );
}

export async function getChaptersByBookId(bookId: number): Promise<Chapter[]> {
  const db = await getDatabase();
  return db.getAllAsync<Chapter>(
    `SELECT id, book_id, number FROM chapters WHERE book_id = ? ORDER BY number ASC`,
    bookId
  );
}

export async function getChapter(
  bookId: number,
  chapterNumber: number
): Promise<Chapter | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Chapter>(
    `SELECT id, book_id, number FROM chapters WHERE book_id = ? AND number = ?`,
    bookId,
    chapterNumber
  );
}

export async function getVersesByChapterId(
  chapterId: number,
  translation: ScriptureTranslation = "en"
): Promise<Verse[]> {
  const db = await getDatabase();
  return db.getAllAsync<Verse>(
    `SELECT id, chapter_id, number, translation, text
     FROM verses
     WHERE chapter_id = ? AND translation = ?
     ORDER BY number ASC`,
    chapterId,
    translation
  );
}

export async function getVersesByBookAndChapter(
  bookId: number,
  chapterNumber: number,
  translation: ScriptureTranslation = "en"
): Promise<Verse[]> {
  const db = await getDatabase();
  const chapter = await db.getFirstAsync<Chapter>(
    `SELECT id, book_id, number FROM chapters WHERE book_id = ? AND number = ?`,
    bookId,
    chapterNumber
  );
  if (!chapter) {
    return [];
  }
  return getVersesByChapterId(chapter.id, translation);
}

export async function searchVerses(
  query: string,
  translation: ScriptureTranslation = "en",
  limit = 50
): Promise<VerseWithReference[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  const db = await getDatabase();
  const pattern = `%${trimmed.replace(/%/g, "\\%")}%`;

  return db.getAllAsync<VerseWithReference>(
    `SELECT v.id, v.chapter_id, v.number, v.translation, v.text,
            b.id AS book_id, b.name AS book_name, b.slug AS book_slug,
            c.number AS chapter_number
     FROM verses v
     INNER JOIN chapters c ON c.id = v.chapter_id
     INNER JOIN books b ON b.id = c.book_id
     WHERE v.translation = ? AND v.text LIKE ? ESCAPE '\\'
     ORDER BY b.order_index, c.number, v.number
     LIMIT ?`,
    translation,
    pattern,
    limit
  );
}

export async function getVerseOfTheDay(
  translation: ScriptureTranslation = "en"
): Promise<VerseWithReference | null> {
  const db = await getDatabase();
  const countRow = await db.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) AS total FROM verses WHERE translation = ?",
    translation
  );
  const total = countRow?.total ?? 0;
  if (total === 0) {
    return null;
  }

  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  const offset = dayOfYear % total;

  return db.getFirstAsync<VerseWithReference>(
    `SELECT v.id, v.chapter_id, v.number, v.translation, v.text,
            b.id AS book_id, b.name AS book_name, b.slug AS book_slug,
            c.number AS chapter_number
     FROM verses v
     INNER JOIN chapters c ON c.id = v.chapter_id
     INNER JOIN books b ON b.id = c.book_id
     WHERE v.translation = ?
     ORDER BY v.id ASC
     LIMIT 1 OFFSET ?`,
    translation,
    offset
  );
}

export async function getVerseByReference(
  bookSlug: string,
  chapterNumber: number,
  verseNumber: number,
  translation: ScriptureTranslation = "en"
): Promise<VerseWithReference | null> {
  const db = await getDatabase();
  return db.getFirstAsync<VerseWithReference>(
    `SELECT v.id, v.chapter_id, v.number, v.translation, v.text,
            b.id AS book_id, b.name AS book_name, b.slug AS book_slug,
            c.number AS chapter_number
     FROM verses v
     INNER JOIN chapters c ON c.id = v.chapter_id
     INNER JOIN books b ON b.id = c.book_id
     WHERE b.slug = ? AND c.number = ? AND v.number = ? AND v.translation = ?
     LIMIT 1`,
    bookSlug,
    chapterNumber,
    verseNumber,
    translation
  );
}

export async function hasFullBibleTranslation(
  translation: ScriptureTranslation
): Promise<boolean> {
  const db = await getDatabase();
  const bookCount = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT b.id) AS count
     FROM books b
     INNER JOIN chapters c ON c.book_id = b.id
     INNER JOIN verses v ON v.chapter_id = c.id AND v.translation = ?`,
    translation
  );
  return (bookCount?.count ?? 0) >= FULL_BIBLE_BOOK_COUNT;
}

export async function isFullBibleImported(): Promise<boolean> {
  await getDatabase();
  return isFullBibleImportedFlag();
}

export async function isChapterAvailable(
  bookSlug: string,
  chapterNumber: number,
  translation: ScriptureTranslation = "en"
): Promise<boolean> {
  const book = await getBookBySlug(bookSlug);
  if (!book) {
    return false;
  }
  const verses = await getVersesByBookAndChapter(book.id, chapterNumber, translation);
  return verses.length > 0;
}

export async function getAdjacentChapter(
  bookId: number,
  currentChapter: number,
  direction: "prev" | "next"
): Promise<Chapter | null> {
  const db = await getDatabase();
  if (direction === "prev") {
    return db.getFirstAsync<Chapter>(
      `SELECT id, book_id, number FROM chapters
       WHERE book_id = ? AND number < ? ORDER BY number DESC LIMIT 1`,
      bookId,
      currentChapter
    );
  }
  return db.getFirstAsync<Chapter>(
    `SELECT id, book_id, number FROM chapters
     WHERE book_id = ? AND number > ? ORDER BY number ASC LIMIT 1`,
    bookId,
    currentChapter
  );
}
