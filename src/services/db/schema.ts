export const SCHEMA_VERSION = 2;

export const CREATE_TABLES_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  testament TEXT NOT NULL CHECK (testament IN ('OT', 'NT')),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  chapter_count INTEGER NOT NULL,
  order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chapters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  UNIQUE (book_id, number)
);

CREATE TABLE IF NOT EXISTS verses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chapter_id INTEGER NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  text TEXT NOT NULL,
  UNIQUE (chapter_id, number)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id INTEGER NOT NULL REFERENCES verses(id) ON DELETE CASCADE,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  note TEXT
);

CREATE TABLE IF NOT EXISTS reading_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL DEFAULT 1,
  viewed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_books_testament ON books (testament, order_index);
CREATE INDEX IF NOT EXISTS idx_chapters_book ON chapters (book_id, number);
CREATE INDEX IF NOT EXISTS idx_verses_chapter ON verses (chapter_id, number);
CREATE INDEX IF NOT EXISTS idx_bookmarks_verse ON bookmarks (verse_id);
CREATE INDEX IF NOT EXISTS idx_history_viewed ON reading_history (viewed_at DESC);
`;

export const MIGRATION_V2_SQL = `
CREATE TABLE IF NOT EXISTS verse_highlights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  verse_id INTEGER NOT NULL REFERENCES verses(id) ON DELETE CASCADE,
  color TEXT NOT NULL CHECK (color IN ('gold', 'blue', 'green', 'rose')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (verse_id)
);

CREATE INDEX IF NOT EXISTS idx_highlights_verse ON verse_highlights (verse_id);
`;
