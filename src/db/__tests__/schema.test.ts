import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from './test-client';

describe('Database Schema', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('creates bookmarks table', async () => {
    const { rows } = await db.execute({ sql: 'PRAGMA table_info(bookmarks)' });
    const names = rows.map((c: any) => c.name);

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

  it('creates classifications table', async () => {
    const { rows } = await db.execute({ sql: 'PRAGMA table_info(classifications)' });
    const names = rows.map((c: any) => c.name);

    expect(names).toContain('id');
    expect(names).toContain('bookmark_id');
    expect(names).toContain('priority');
    expect(names).toContain('reading_time_min');
    expect(names).toContain('created_at');
  });

  it('creates topics table', async () => {
    const { rows } = await db.execute({ sql: 'PRAGMA table_info(topics)' });
    const names = rows.map((c: any) => c.name);

    expect(names).toContain('id');
    expect(names).toContain('name');
  });

  it('creates bookmark_topics junction table', async () => {
    const { rows } = await db.execute({ sql: 'PRAGMA table_info(bookmark_topics)' });
    const names = rows.map((c: any) => c.name);

    expect(names).toContain('bookmark_id');
    expect(names).toContain('topic_id');
  });

  it('enforces unique topic names', async () => {
    await db.execute({ sql: 'INSERT INTO topics (id, name) VALUES (?, ?)', args: ['t1', 'AI'] });
    await expect(
      db.execute({ sql: 'INSERT INTO topics (id, name) VALUES (?, ?)', args: ['t2', 'AI'] })
    ).rejects.toThrow();
  });

  it('enforces content_type check constraint', async () => {
    await expect(
      db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
        args: ['b1', 'https://example.com', 'invalid_type'],
      })
    ).rejects.toThrow();
  });

  it('enforces priority check constraint', async () => {
    const bookmarkId = 'b1';
    await db.execute({
      sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
      args: [bookmarkId, 'https://example.com', 'outer_link'],
    });

    await expect(
      db.execute({
        sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
        args: ['c1', bookmarkId, 'urgent', 5],
      })
    ).rejects.toThrow();
  });

  it('allows valid content_type values', async () => {
    const types = ['outer_link', 'thread', 'x_article', 'video'];
    for (const [i, type] of types.entries()) {
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
        args: [`b${i}`, `https://example.com/${i}`, type],
      });
    }

    const { rows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM bookmarks' });
    expect((rows[0] as any).count).toBe(4);
  });

  it('allows valid priority values', async () => {
    const bookmarkId = 'b1';
    await db.execute({
      sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
      args: [bookmarkId, 'https://example.com', 'outer_link'],
    });

    const priorities = ['high', 'medium', 'low'];
    for (const [i, priority] of priorities.entries()) {
      await db.execute({
        sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
        args: [`c${i}`, bookmarkId, priority, 5 + i],
      });
    }

    const { rows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM classifications' });
    expect((rows[0] as any).count).toBe(3);
  });
});
