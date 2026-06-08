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
    topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
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
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES topics(id) ON DELETE CASCADE,
    created_by TEXT CHECK(created_by IN ('ai', 'user')) DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, parent_id)
  );

  CREATE TABLE IF NOT EXISTS hashtags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bookmark_hashtags (
    bookmark_id TEXT REFERENCES bookmarks(id) ON DELETE CASCADE,
    hashtag_id TEXT REFERENCES hashtags(id) ON DELETE CASCADE,
    PRIMARY KEY (bookmark_id, hashtag_id)
  );

  CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY,
    status TEXT CHECK(status IN ('running', 'paused', 'completed', 'failed')) DEFAULT 'running',
    cursor TEXT,
    total_fetched INTEGER DEFAULT 0,
    total_classified INTEGER DEFAULT 0,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
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
    parser_version INTEGER DEFAULT 1,
    content_hash TEXT,
    og_title TEXT,
    og_description TEXT,
    og_image TEXT,
    og_site_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE VIRTUAL TABLE IF NOT EXISTS article_content_fts USING fts5(
    extracted_text,
    content='article_content',
    content_rowid='rowid'
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

  // Migration: add parser_version if missing (existing databases)
  try {
    await db.execute({
      sql: 'ALTER TABLE article_content ADD COLUMN parser_version INTEGER DEFAULT 1',
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }

  // Migration: add content_hash if missing (existing databases)
  try {
    await db.execute({
      sql: 'ALTER TABLE article_content ADD COLUMN content_hash TEXT',
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }

  // Migration: add og_title if missing (existing databases)
  try {
    await db.execute({
      sql: 'ALTER TABLE article_content ADD COLUMN og_title TEXT',
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }

  // Migration: add og_description if missing (existing databases)
  try {
    await db.execute({
      sql: 'ALTER TABLE article_content ADD COLUMN og_description TEXT',
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }

  // Migration: add og_image if missing (existing databases)
  try {
    await db.execute({
      sql: 'ALTER TABLE article_content ADD COLUMN og_image TEXT',
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }

  // Migration: add og_site_name if missing (existing databases)
  try {
    await db.execute({
      sql: 'ALTER TABLE article_content ADD COLUMN og_site_name TEXT',
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }

  // Migration: create FTS5 virtual table if missing
  try {
    await db.executeMultiple(`
      CREATE VIRTUAL TABLE IF NOT EXISTS article_content_fts USING fts5(
        extracted_text,
        content='article_content',
        content_rowid='rowid'
      );

      CREATE TRIGGER IF NOT EXISTS article_content_ai AFTER INSERT ON article_content BEGIN
        INSERT INTO article_content_fts(rowid, extracted_text)
        VALUES (new.rowid, new.extracted_text);
      END;

      CREATE TRIGGER IF NOT EXISTS article_content_ad AFTER DELETE ON article_content BEGIN
        INSERT INTO article_content_fts(article_content_fts, rowid, extracted_text)
        VALUES('delete', old.rowid, old.extracted_text);
      END;

      CREATE TRIGGER IF NOT EXISTS article_content_au AFTER UPDATE ON article_content BEGIN
        INSERT INTO article_content_fts(article_content_fts, rowid, extracted_text)
        VALUES('delete', old.rowid, old.extracted_text);
        INSERT INTO article_content_fts(rowid, extracted_text)
        VALUES (new.rowid, new.extracted_text);
      END;
    `);
  } catch {
    // FTS table or triggers already exist — ignore
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

  // Migration: add topic_id to bookmarks if missing (Phase 1 hierarchical topics)
  try {
    await db.execute({
      sql: 'ALTER TABLE bookmarks ADD COLUMN topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL',
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }

  // Migration: migrate data from bookmark_topics to bookmarks.topic_id
  // Take the first topic per bookmark (old model was many-to-many, new is single)
  try {
    await db.executeMultiple(`
      UPDATE bookmarks SET topic_id = (
        SELECT bt.topic_id FROM bookmark_topics bt
        WHERE bt.bookmark_id = bookmarks.id
        LIMIT 1
      ) WHERE topic_id IS NULL AND EXISTS (
        SELECT 1 FROM bookmark_topics bt WHERE bt.bookmark_id = bookmarks.id
      );
    `);
  } catch {
    // bookmark_topics may not exist yet — ignore
  }

  // Migration: upgrade topics table to support hierarchy
  try {
    await db.execute({
      sql: "ALTER TABLE topics ADD COLUMN parent_id TEXT REFERENCES topics(id) ON DELETE CASCADE",
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }
  try {
    await db.execute({
      sql: "ALTER TABLE topics ADD COLUMN created_by TEXT CHECK(created_by IN ('ai', 'user')) DEFAULT 'user'",
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }
  try {
    await db.execute({
      sql: 'ALTER TABLE topics ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
      args: [],
    });
  } catch {
    // Column already exists — ignore
  }

  // Migration: drop old bookmark_topics junction (replaced by bookmarks.topic_id + bookmark_hashtags)
  try {
    await db.execute('DROP TABLE IF EXISTS bookmark_topics');
  } catch {
    // Table may not exist — ignore
  }
}
