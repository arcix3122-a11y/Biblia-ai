import { getDatabase } from "./database";
import type { VerseWithReference } from "@/types/scripture";
import type { SemanticTopic, TopicVerseRef } from "@/data/semanticTopics";

const RESULT_LIMIT = 40;

export async function searchTopicVerses(topic: SemanticTopic): Promise<VerseWithReference[]> {
  const byRef = await searchByVerseRefs(topic.verseRefs ?? []);
  if (byRef.length >= 8) {
    return dedupeVerses(byRef).slice(0, RESULT_LIMIT);
  }

  const keywordHits = await searchByKeywords(topic.keywords);
  return dedupeVerses([...byRef, ...keywordHits]).slice(0, RESULT_LIMIT);
}

async function searchByVerseRefs(refs: TopicVerseRef[]): Promise<VerseWithReference[]> {
  if (refs.length === 0) {
    return [];
  }

  const db = await getDatabase();
  const results: VerseWithReference[] = [];

  for (const ref of refs) {
    const rows = await db.getAllAsync<VerseWithReference>(
      `SELECT v.id, v.chapter_id, v.number, v.text,
              b.id AS book_id, b.name AS book_name, b.slug AS book_slug,
              c.number AS chapter_number
       FROM verses v
       INNER JOIN chapters c ON c.id = v.chapter_id
       INNER JOIN books b ON b.id = c.book_id
       WHERE b.slug = ? AND c.number = ?
       ORDER BY v.number ASC
       LIMIT 12`,
      ref.bookSlug,
      ref.chapter
    );
    results.push(...rows);
  }

  return results;
}

async function searchByKeywords(keywords: string[]): Promise<VerseWithReference[]> {
  if (keywords.length === 0) {
    return [];
  }

  const db = await getDatabase();
  const clauses = keywords.map(() => "v.text LIKE ? ESCAPE '\\'").join(" OR ");
  const patterns = keywords.map((k) => `%${k.replace(/%/g, "\\%")}%`);

  return db.getAllAsync<VerseWithReference>(
    `SELECT v.id, v.chapter_id, v.number, v.text,
            b.id AS book_id, b.name AS book_name, b.slug AS book_slug,
            c.number AS chapter_number
     FROM verses v
     INNER JOIN chapters c ON c.id = v.chapter_id
     INNER JOIN books b ON b.id = c.book_id
     WHERE ${clauses}
     ORDER BY b.order_index, c.number, v.number
     LIMIT ?`,
    ...patterns,
    RESULT_LIMIT
  );
}

function dedupeVerses(verses: VerseWithReference[]): VerseWithReference[] {
  const seen = new Set<number>();
  const out: VerseWithReference[] = [];
  for (const verse of verses) {
    if (seen.has(verse.id)) {
      continue;
    }
    seen.add(verse.id);
    out.push(verse);
  }
  return out;
}
