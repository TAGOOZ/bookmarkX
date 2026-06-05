import Database from 'better-sqlite3';

export function initializeSchema(db: Database.Database): void {
  db.exec(`
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
  `);
}
