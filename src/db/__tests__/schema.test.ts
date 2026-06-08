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
    expect(names).toContain('parent_id');
    expect(names).toContain('created_by');
    expect(names).toContain('created_at');
  });

  it('creates hashtags table', async () => {
    const { rows } = await db.execute({ sql: 'PRAGMA table_info(hashtags)' });
    const names = rows.map((c: any) => c.name);

    expect(names).toContain('id');
    expect(names).toContain('name');
    expect(names).toContain('created_at');
  });

  it('creates bookmark_hashtags junction table', async () => {
    const { rows } = await db.execute({ sql: 'PRAGMA table_info(bookmark_hashtags)' });
    const names = rows.map((c: any) => c.name);

    expect(names).toContain('bookmark_id');
    expect(names).toContain('hashtag_id');
  });

  it('creates import_jobs table', async () => {
    const { rows } = await db.execute({ sql: 'PRAGMA table_info(import_jobs)' });
    const names = rows.map((c: any) => c.name);

    expect(names).toContain('id');
    expect(names).toContain('status');
    expect(names).toContain('cursor');
    expect(names).toContain('total_fetched');
    expect(names).toContain('total_classified');
    expect(names).toContain('started_at');
    expect(names).toContain('completed_at');
  });

  it('enforces unique topic names within parent', async () => {
    // Create a parent topic first
    await db.execute({ sql: 'INSERT INTO topics (id, name, parent_id) VALUES (?, ?, ?)', args: ['tp', 'Tech', null] });
    // Try to create duplicate child under same parent
    await db.execute({ sql: 'INSERT INTO topics (id, name, parent_id) VALUES (?, ?, ?)', args: ['t1', 'AI', 'tp'] });
    await expect(
      db.execute({ sql: 'INSERT INTO topics (id, name, parent_id) VALUES (?, ?, ?)', args: ['t2', 'AI', 'tp'] })
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

  describe('Phase 2 tables', () => {
    it('creates summaries table', async () => {
      const { rows } = await db.execute({ sql: 'PRAGMA table_info(summaries)' });
      const names = rows.map((c: any) => c.name);

      expect(names).toContain('id');
      expect(names).toContain('bookmark_id');
      expect(names).toContain('content_en');
      expect(names).toContain('content_ar');
      expect(names).toContain('model_used');
      expect(names).toContain('created_at');
    });

    it('creates article_content table', async () => {
      const { rows } = await db.execute({ sql: 'PRAGMA table_info(article_content)' });
      const names = rows.map((c: any) => c.name);

      expect(names).toContain('id');
      expect(names).toContain('bookmark_id');
      expect(names).toContain('extracted_text');
      expect(names).toContain('word_count');
      expect(names).toContain('created_at');
    });

    it('creates highlights table', async () => {
      const { rows } = await db.execute({ sql: 'PRAGMA table_info(highlights)' });
      const names = rows.map((c: any) => c.name);

      expect(names).toContain('id');
      expect(names).toContain('bookmark_id');
      expect(names).toContain('selected_text');
      expect(names).toContain('note');
      expect(names).toContain('color');
      expect(names).toContain('created_at');
    });

    it('creates notes table', async () => {
      const { rows } = await db.execute({ sql: 'PRAGMA table_info(notes)' });
      const names = rows.map((c: any) => c.name);

      expect(names).toContain('id');
      expect(names).toContain('bookmark_id');
      expect(names).toContain('title');
      expect(names).toContain('content');
      expect(names).toContain('created_at');
      expect(names).toContain('updated_at');
    });

    it('creates chat_sessions table', async () => {
      const { rows } = await db.execute({ sql: 'PRAGMA table_info(chat_sessions)' });
      const names = rows.map((c: any) => c.name);

      expect(names).toContain('id');
      expect(names).toContain('bookmark_id');
      expect(names).toContain('created_at');
    });

    it('creates chat_messages table', async () => {
      const { rows } = await db.execute({ sql: 'PRAGMA table_info(chat_messages)' });
      const names = rows.map((c: any) => c.name);

      expect(names).toContain('id');
      expect(names).toContain('session_id');
      expect(names).toContain('role');
      expect(names).toContain('content');
      expect(names).toContain('created_at');
    });

    it('creates glossary_terms table', async () => {
      const { rows } = await db.execute({ sql: 'PRAGMA table_info(glossary_terms)' });
      const names = rows.map((c: any) => c.name);

      expect(names).toContain('id');
      expect(names).toContain('term');
      expect(names).toContain('definition');
      expect(names).toContain('created_at');
    });

    it('creates bookmark_glossary junction table', async () => {
      const { rows } = await db.execute({ sql: 'PRAGMA table_info(bookmark_glossary)' });
      const names = rows.map((c: any) => c.name);

      expect(names).toContain('bookmark_id');
      expect(names).toContain('term_id');
    });

    it('enforces unique glossary terms', async () => {
      await db.execute({
        sql: 'INSERT INTO glossary_terms (id, term, definition) VALUES (?, ?, ?)',
        args: ['g1', 'API', 'Application Programming Interface'],
      });
      await expect(
        db.execute({
          sql: 'INSERT INTO glossary_terms (id, term, definition) VALUES (?, ?, ?)',
          args: ['g2', 'API', 'Duplicate term'],
        })
      ).rejects.toThrow();
    });

    it('enforces chat message role check constraint', async () => {
      const sessionId = 's1';
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
        args: ['b1', 'https://example.com', 'outer_link'],
      });
      await db.execute({
        sql: 'INSERT INTO chat_sessions (id, bookmark_id) VALUES (?, ?)',
        args: [sessionId, 'b1'],
      });

      await expect(
        db.execute({
          sql: 'INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)',
          args: ['m1', sessionId, 'invalid_role', 'Hello'],
        })
      ).rejects.toThrow();
    });

    it('allows valid chat message roles', async () => {
      const sessionId = 's1';
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
        args: ['b1', 'https://example.com', 'outer_link'],
      });
      await db.execute({
        sql: 'INSERT INTO chat_sessions (id, bookmark_id) VALUES (?, ?)',
        args: [sessionId, 'b1'],
      });

      const roles = ['user', 'assistant'];
      for (const [i, role] of roles.entries()) {
        await db.execute({
          sql: 'INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)',
          args: [`m${i}`, sessionId, role, `Message ${i}`],
        });
      }

      const { rows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM chat_messages' });
      expect((rows[0] as any).count).toBe(2);
    });
  });
});
