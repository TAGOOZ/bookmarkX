import type { Client } from '@libsql/client';

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    tweet_id TEXT UNIQUE,
    url TEXT NOT NULL,
    content_type TEXT CHECK(content_type IN ('outer_link', 'thread', 'x_article', 'video')),
    title TEXT,
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
`;

export async function initializeSchema(db: Client): Promise<void> {
  await db.executeMultiple(SCHEMA_SQL);
}
