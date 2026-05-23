export type Testament = "OT" | "NT";

export interface Book {
  id: number;
  testament: Testament;
  name: string;
  slug: string;
  chapter_count: number;
  order_index: number;
}

export interface Chapter {
  id: number;
  book_id: number;
  number: number;
}

export interface Verse {
  id: number;
  chapter_id: number;
  number: number;
  text: string;
}

export interface VerseWithReference extends Verse {
  book_id: number;
  book_name: string;
  book_slug: string;
  chapter_number: number;
}

export interface Bookmark {
  id: number;
  verse_id: number;
  book_id: number;
  chapter: number;
  verse: number;
  created_at: string;
  note: string | null;
  book_name?: string;
  book_slug?: string;
  verse_text?: string;
}

export type HighlightColor = "gold" | "blue" | "green" | "rose";

export interface VerseHighlight {
  id: number;
  verse_id: number;
  color: HighlightColor;
  created_at: string;
}

export interface ReadingHistoryEntry {
  id: number;
  book_id: number;
  chapter: number;
  verse: number;
  viewed_at: string;
  book_name?: string;
  book_slug?: string;
}

export interface BibleSeedBook {
  testament: Testament;
  name: string;
  slug: string;
  order_index: number;
  chapter_count: number;
  chapters: BibleSeedChapter[];
}

export interface BibleSeedChapter {
  number: number;
  verses: BibleSeedVerse[];
}

export interface BibleSeedVerse {
  number: number;
  text: string;
}

export interface BibleSeedFile {
  version: number;
  translation: string;
  books: BibleSeedBook[];
}
