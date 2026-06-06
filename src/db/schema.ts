import type { Client } from '@libsql/client';

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    tweet_id TEXT UNIQUE,
    url TEXT NOT NULL,
    content_type TEXT CHECK(content_type IN ('outer_link', 'thread', 'x_article', 'video')),
    title TEXT,
    title_ar TEXT,
    title_en TEXT,
    author_name TEXT,
    author_handle TEXT,
    tweet_text TEXT,
    fetched_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS classifications (
    id TEXT PRIMARY KEY,
    bookmark_id TEXT REFERENCES bookmarks(id),
    priority TEXT CHECK(priority IN ('high', 'medium', 'low')),
    reading_time_min INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS topics (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookmark_topics (
    bookmark_id TEXT REFERENCES bookmarks(id),
    topic_id TEXT REFERENCES topics(id),
    PRIMARY KEY (bookmark_id, topic_id)
  );

  CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    bookmark_id TEXT REFERENCES bookmarks(id),
    content_en TEXT,
    content_ar TEXT,
    model_used TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS article_content (
    id TEXT PRIMARY KEY,
    bookmark_id TEXT REFERENCES bookmarks(id),
    extracted_text TEXT,
    word_count INTEGER,
    blocks_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS highlights (
    id TEXT PRIMARY KEY,
    bookmark_id TEXT REFERENCES bookmarks(id),
    selected_text TEXT NOT NULL,
    note TEXT,
    color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    bookmark_id TEXT REFERENCES bookmarks(id),
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    bookmark_id TEXT REFERENCES bookmarks(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES chat_sessions(id),
    role TEXT CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS glossary_terms (
    id TEXT PRIMARY KEY,
    term TEXT UNIQUE NOT NULL,
    definition TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookmark_glossary (
    bookmark_id TEXT REFERENCES bookmarks(id),
    term_id TEXT REFERENCES glossary_terms(id),
    PRIMARY KEY (bookmark_id, term_id)
  );
`;

export async function initializeSchema(db: Client): Promise<void> {
  await db.executeMultiple(SCHEMA_SQL);

  // Migration: add blocks_json if missing (existing databases)
  try {
    await db.execute({
      sql: 'ALTER TABLE article_content ADD COLUMN blocks_json TEXT',
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }

  // Migration: add title_ar and title_en if missing (existing databases)
  try {
    await db.execute({
      sql: 'ALTER TABLE bookmarks ADD COLUMN title_ar TEXT',
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }
  try {
    await db.execute({
      sql: 'ALTER TABLE bookmarks ADD COLUMN title_en TEXT',
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }
}
