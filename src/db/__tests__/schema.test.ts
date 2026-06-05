import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../schema';

describe('Database Schema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
  });

  it('creates bookmarks table', () => {
    const columns = db.prepare("PRAGMA table_info(bookmarks)").all();
    const names = columns.map((c: any) => c.name);

    expect(names).toContain('id');
    expect(names).toContain('tweet_id');
    expect(names).toContain('url');
    expect(names).toContain('content_type');
    expect(names).toContain('title');
    expect(names).toContain('author_name');
    expect(names).toContain('author_handle');
    expect(names).toContain('tweet_text');
    expect(names).toContain('fetched_at');
    expect(names).toContain('created_at');
  });

  it('creates classifications table', () => {
    const columns = db.prepare("PRAGMA table_info(classifications)").all();
    const names = columns.map((c: any) => c.name);

    expect(names).toContain('id');
    expect(names).toContain('bookmark_id');
    expect(names).toContain('priority');
    expect(names).toContain('reading_time_min');
    expect(names).toContain('created_at');
  });

  it('creates topics table', () => {
    const columns = db.prepare("PRAGMA table_info(topics)").all();
    const names = columns.map((c: any) => c.name);

    expect(names).toContain('id');
    expect(names).toContain('name');
  });

  it('creates bookmark_topics junction table', () => {
    const columns = db.prepare("PRAGMA table_info(bookmark_topics)").all();
    const names = columns.map((c: any) => c.name);

    expect(names).toContain('bookmark_id');
    expect(names).toContain('topic_id');
  });

  it('enforces unique topic names', () => {
    db.prepare("INSERT INTO topics (id, name) VALUES (?, ?)").run('t1', 'AI');
    expect(() => {
      db.prepare("INSERT INTO topics (id, name) VALUES (?, ?)").run('t2', 'AI');
    }).toThrow();
  });

  it('enforces content_type check constraint', () => {
    expect(() => {
      db.prepare(
        "INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)"
      ).run('b1', 'https://example.com', 'invalid_type');
    }).toThrow();
  });

  it('enforces priority check constraint', () => {
    const bookmarkId = 'b1';
    db.prepare(
      "INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)"
    ).run(bookmarkId, 'https://example.com', 'outer_link');

    expect(() => {
      db.prepare(
        "INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)"
      ).run('c1', bookmarkId, 'urgent', 5);
    }).toThrow();
  });

  it('allows valid content_type values', () => {
    const types = ['outer_link', 'thread', 'x_article', 'video'];
    types.forEach((type, i) => {
      db.prepare(
        "INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)"
      ).run(`b${i}`, `https://example.com/${i}`, type);
    });

    const count = db.prepare("SELECT COUNT(*) as count FROM bookmarks").get() as any;
    expect(count.count).toBe(4);
  });

  it('allows valid priority values', () => {
    const bookmarkId = 'b1';
    db.prepare(
      "INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)"
    ).run(bookmarkId, 'https://example.com', 'outer_link');

    const priorities = ['high', 'medium', 'low'];
    priorities.forEach((priority, i) => {
      db.prepare(
        "INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)"
      ).run(`c${i}`, bookmarkId, priority, 5 + i);
    });

    const count = db.prepare("SELECT COUNT(*) as count FROM classifications").get() as any;
    expect(count.count).toBe(3);
  });
});
