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

  describe('table structure', () => {
    it('creates bookmarks table with all expected columns', async () => {
      const { rows } = await db.execute({ sql: 'PRAGMA table_info(bookmarks)' });
      const names = rows.map((c: any) => c.name);

      expect(names).toContain('id');
      expect(names).toContain('tweet_id');
      expect(names).toContain('url');
      expect(names).toContain('content_type');
      expect(names).toContain('title');
      expect(names).toContain('title_ar');
      expect(names).toContain('title_en');
      expect(names).toContain('author_name');
      expect(names).toContain('author_handle');
      expect(names).toContain('tweet_text');
      expect(names).toContain('topic_id');
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

    it('creates topics table with hierarchy support', async () => {
      const { rows } = await db.execute({ sql: 'PRAGMA table_info(topics)' });
      const names = rows.map((c: any) => c.name);
      expect(names).toContain('id');
      expect(names).toContain('name');
      expect(names).toContain('parent_id');
      expect(names).toContain('created_by');
      expect(names).toContain('created_at');
    });

    it('creates hashtags and bookmark_hashtags tables', async () => {
      const { rows: hashtagCols } = await db.execute({ sql: 'PRAGMA table_info(hashtags)' });
      expect(hashtagCols.map((c: any) => c.name)).toContain('name');

      const { rows: junctionCols } = await db.execute({ sql: 'PRAGMA table_info(bookmark_hashtags)' });
      expect(junctionCols.map((c: any) => c.name)).toContain('bookmark_id');
      expect(junctionCols.map((c: any) => c.name)).toContain('hashtag_id');
    });
  });

  describe('NOT NULL constraints', () => {
    it('rejects bookmark with NULL url', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
          args: ['b1', null, 'outer_link'],
        })
      ).rejects.toThrow();
    });

    it('rejects hashtag with NULL name', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO hashtags (id, name) VALUES (?, ?)',
          args: ['h1', null],
        })
      ).rejects.toThrow();
    });

    it('rejects chat_message with NULL content', async () => {
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
          args: ['m1', sessionId, 'user', null],
        })
      ).rejects.toThrow();
    });

    it('rejects highlight with NULL selected_text', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO highlights (id, bookmark_id, selected_text) VALUES (?, ?, ?)',
          args: ['h1', 'b1', null],
        })
      ).rejects.toThrow();
    });

    it('rejects glossary_term with NULL term', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO glossary_terms (id, term, definition) VALUES (?, ?, ?)',
          args: ['g1', null, 'def'],
        })
      ).rejects.toThrow();
    });

    it('rejects glossary_term with NULL definition', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO glossary_terms (id, term, definition) VALUES (?, ?, ?)',
          args: ['g1', 'API', null],
        })
      ).rejects.toThrow();
    });

    it('rejects notification with NULL type', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO notifications (id, type, title) VALUES (?, ?, ?)',
          args: ['n1', null, 'Title'],
        })
      ).rejects.toThrow();
    });

    it('rejects notification with NULL title', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO notifications (id, type, title) VALUES (?, ?, ?)',
          args: ['n1', 'status', null],
        })
      ).rejects.toThrow();
    });
  });

  describe('CHECK constraints', () => {
    it('enforces content_type check constraint', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
          args: ['b1', 'https://example.com', 'invalid_type'],
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

    it('enforces priority check constraint', async () => {
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
        args: ['b1', 'https://example.com', 'outer_link'],
      });
      await expect(
        db.execute({
          sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
          args: ['c1', 'b1', 'urgent', 5],
        })
      ).rejects.toThrow();
    });

    it('allows valid priority values', async () => {
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
        args: ['b1', 'https://example.com', 'outer_link'],
      });
      for (const [i, priority] of ['high', 'medium', 'low'].entries()) {
        await db.execute({
          sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
          args: [`c${i}`, 'b1', priority, 5 + i],
        });
      }
      const { rows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM classifications' });
      expect((rows[0] as any).count).toBe(3);
    });

    it('enforces chat message role check constraint', async () => {
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
        args: ['b1', 'https://example.com', 'outer_link'],
      });
      await db.execute({
        sql: 'INSERT INTO chat_sessions (id, bookmark_id) VALUES (?, ?)',
        args: ['s1', 'b1'],
      });
      await expect(
        db.execute({
          sql: 'INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)',
          args: ['m1', 's1', 'invalid_role', 'Hello'],
        })
      ).rejects.toThrow();
    });

    it('enforces created_by check constraint on topics', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO topics (id, name, created_by) VALUES (?, ?, ?)',
          args: ['t1', 'Test', 'invalid'],
        })
      ).rejects.toThrow();
    });

    it('enforces import_jobs status check constraint', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO import_jobs (id, status) VALUES (?, ?)',
          args: ['j1', 'invalid_status'],
        })
      ).rejects.toThrow();
    });

    it('enforces notification type check constraint', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO notifications (id, type, title) VALUES (?, ?, ?)',
          args: ['n1', 'invalid', 'Title'],
        })
      ).rejects.toThrow();
    });
  });

  describe('UNIQUE constraints', () => {
    it('enforces unique tweet_id on bookmarks', async () => {
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, tweet_id, content_type) VALUES (?, ?, ?, ?)',
        args: ['b1', 'https://example.com/1', '123', 'outer_link'],
      });
      await expect(
        db.execute({
          sql: 'INSERT INTO bookmarks (id, url, tweet_id, content_type) VALUES (?, ?, ?, ?)',
          args: ['b2', 'https://example.com/2', '123', 'outer_link'],
        })
      ).rejects.toThrow();
    });

    it('enforces unique topic names within parent', async () => {
      await db.execute({ sql: 'INSERT INTO topics (id, name, parent_id) VALUES (?, ?, ?)', args: ['tp', 'Tech', null] });
      await db.execute({ sql: 'INSERT INTO topics (id, name, parent_id) VALUES (?, ?, ?)', args: ['t1', 'AI', 'tp'] });
      await expect(
        db.execute({ sql: 'INSERT INTO topics (id, name, parent_id) VALUES (?, ?, ?)', args: ['t2', 'AI', 'tp'] })
      ).rejects.toThrow();
    });

    it('allows same topic name under different parents', async () => {
      await db.execute({ sql: 'INSERT INTO topics (id, name, parent_id) VALUES (?, ?, ?)', args: ['p1', 'Tech', null] });
      await db.execute({ sql: 'INSERT INTO topics (id, name, parent_id) VALUES (?, ?, ?)', args: ['p2', 'Science', null] });
      await db.execute({ sql: 'INSERT INTO topics (id, name, parent_id) VALUES (?, ?, ?)', args: ['t1', 'AI', 'p1'] });
      await db.execute({ sql: 'INSERT INTO topics (id, name, parent_id) VALUES (?, ?, ?)', args: ['t2', 'AI', 'p2'] });

      const { rows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM topics' });
      expect((rows[0] as any).count).toBe(4);
    });

    it('enforces unique hashtag names', async () => {
      await db.execute({ sql: 'INSERT INTO hashtags (id, name) VALUES (?, ?)', args: ['h1', 'ai'] });
      await expect(
        db.execute({ sql: 'INSERT INTO hashtags (id, name) VALUES (?, ?)', args: ['h2', 'ai'] })
      ).rejects.toThrow();
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

    it('enforces unique bookmark_hashtags composite key', async () => {
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
        args: ['b1', 'https://example.com', 'outer_link'],
      });
      await db.execute({ sql: 'INSERT INTO hashtags (id, name) VALUES (?, ?)', args: ['h1', 'ai'] });
      await db.execute({
        sql: 'INSERT INTO bookmark_hashtags (bookmark_id, hashtag_id) VALUES (?, ?)',
        args: ['b1', 'h1'],
      });
      await expect(
        db.execute({
          sql: 'INSERT INTO bookmark_hashtags (bookmark_id, hashtag_id) VALUES (?, ?)',
          args: ['b1', 'h1'],
        })
      ).rejects.toThrow();
    });
  });

  describe('FOREIGN KEY constraints', () => {
    it('rejects classification for non-existent bookmark', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
          args: ['c1', 'nonexistent', 'high', 5],
        })
      ).rejects.toThrow();
    });

    it('rejects bookmark_hashtags for non-existent bookmark', async () => {
      await db.execute({ sql: 'INSERT INTO hashtags (id, name) VALUES (?, ?)', args: ['h1', 'ai'] });
      await expect(
        db.execute({
          sql: 'INSERT INTO bookmark_hashtags (bookmark_id, hashtag_id) VALUES (?, ?)',
          args: ['nonexistent', 'h1'],
        })
      ).rejects.toThrow();
    });

    it('rejects bookmark_hashtags for non-existent hashtag', async () => {
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
        args: ['b1', 'https://example.com', 'outer_link'],
      });
      await expect(
        db.execute({
          sql: 'INSERT INTO bookmark_hashtags (bookmark_id, hashtag_id) VALUES (?, ?)',
          args: ['b1', 'nonexistent'],
        })
      ).rejects.toThrow();
    });

    it('rejects chat_message for non-existent session', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, ?, ?)',
          args: ['m1', 'nonexistent', 'user', 'Hello'],
        })
      ).rejects.toThrow();
    });

    it('rejects summary for non-existent bookmark', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO summaries (id, bookmark_id, content_en) VALUES (?, ?, ?)',
          args: ['sum1', 'nonexistent', 'Summary text'],
        })
      ).rejects.toThrow();
    });

    it('rejects highlight for non-existent bookmark', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO highlights (id, bookmark_id, selected_text) VALUES (?, ?, ?)',
          args: ['h1', 'nonexistent', 'selected text'],
        })
      ).rejects.toThrow();
    });

    it('rejects note for non-existent bookmark', async () => {
      await expect(
        db.execute({
          sql: 'INSERT INTO notes (id, bookmark_id, content) VALUES (?, ?, ?)',
          args: ['n1', 'nonexistent', 'Note content'],
        })
      ).rejects.toThrow();
    });

    it('rejects glossary for non-existent bookmark', async () => {
      await db.execute({
        sql: 'INSERT INTO glossary_terms (id, term, definition) VALUES (?, ?, ?)',
        args: ['g1', 'API', 'Application Programming Interface'],
      });
      await expect(
        db.execute({
          sql: 'INSERT INTO bookmark_glossary (bookmark_id, term_id) VALUES (?, ?)',
          args: ['nonexistent', 'g1'],
        })
      ).rejects.toThrow();
    });
  });

  describe('DEFAULT values', () => {
    it('auto-generates created_at for bookmarks', async () => {
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
        args: ['b1', 'https://example.com', 'outer_link'],
      });
      const { rows } = await db.execute({ sql: 'SELECT created_at FROM bookmarks WHERE id = ?', args: ['b1'] });
      expect((rows[0] as any).created_at).toBeDefined();
    });

    it('defaults topic created_by to user', async () => {
      await db.execute({
        sql: 'INSERT INTO topics (id, name) VALUES (?, ?)',
        args: ['t1', 'Test'],
      });
      const { rows } = await db.execute({ sql: 'SELECT created_by FROM topics WHERE id = ?', args: ['t1'] });
      expect((rows[0] as any).created_by).toBe('user');
    });

    it('defaults import_jobs status to running', async () => {
      await db.execute({
        sql: 'INSERT INTO import_jobs (id) VALUES (?)',
        args: ['j1'],
      });
      const { rows } = await db.execute({ sql: 'SELECT status FROM import_jobs WHERE id = ?', args: ['j1'] });
      expect((rows[0] as any).status).toBe('running');
    });

    it('defaults notifications read to 0', async () => {
      await db.execute({
        sql: 'INSERT INTO notifications (id, type, title) VALUES (?, ?, ?)',
        args: ['n1', 'status', 'Title'],
      });
      const { rows } = await db.execute({ sql: 'SELECT read FROM notifications WHERE id = ?', args: ['n1'] });
      expect((rows[0] as any).read).toBe(0);
    });
  });

  describe('cascading behavior', () => {
    it('deleting topic cascades to child topics via ON DELETE CASCADE', async () => {
      await db.execute({ sql: 'INSERT INTO topics (id, name, parent_id) VALUES (?, ?, ?)', args: ['p1', 'Parent', null] });
      await db.execute({ sql: 'INSERT INTO topics (id, name, parent_id) VALUES (?, ?, ?)', args: ['c1', 'Child', 'p1'] });

      await db.execute({ sql: 'DELETE FROM topics WHERE id = ?', args: ['p1'] });

      const { rows } = await db.execute({ sql: 'SELECT * FROM topics WHERE id = ?', args: ['c1'] });
      expect(rows).toHaveLength(0);
    });

    it('deleting bookmark cascades to bookmark_hashtags', async () => {
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
        args: ['b1', 'https://example.com', 'outer_link'],
      });
      await db.execute({ sql: 'INSERT INTO hashtags (id, name) VALUES (?, ?)', args: ['h1', 'ai'] });
      await db.execute({
        sql: 'INSERT INTO bookmark_hashtags (bookmark_id, hashtag_id) VALUES (?, ?)',
        args: ['b1', 'h1'],
      });

      await db.execute({ sql: 'DELETE FROM bookmarks WHERE id = ?', args: ['b1'] });

      const { rows } = await db.execute({ sql: 'SELECT * FROM bookmark_hashtags WHERE bookmark_id = ?', args: ['b1'] });
      expect(rows).toHaveLength(0);
    });

    it('deleting hashtag cascades to bookmark_hashtags', async () => {
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)',
        args: ['b1', 'https://example.com', 'outer_link'],
      });
      await db.execute({ sql: 'INSERT INTO hashtags (id, name) VALUES (?, ?)', args: ['h1', 'ai'] });
      await db.execute({
        sql: 'INSERT INTO bookmark_hashtags (bookmark_id, hashtag_id) VALUES (?, ?)',
        args: ['b1', 'h1'],
      });

      await db.execute({ sql: 'DELETE FROM hashtags WHERE id = ?', args: ['h1'] });

      const { rows } = await db.execute({ sql: 'SELECT * FROM bookmark_hashtags WHERE hashtag_id = ?', args: ['h1'] });
      expect(rows).toHaveLength(0);
    });

    it('deleting bookmark sets topic_id to NULL via ON DELETE SET NULL', async () => {
      await db.execute({ sql: 'INSERT INTO topics (id, name) VALUES (?, ?)', args: ['t1', 'AI'] });
      await db.execute({
        sql: 'INSERT INTO bookmarks (id, url, content_type, topic_id) VALUES (?, ?, ?, ?)',
        args: ['b1', 'https://example.com', 'outer_link', 't1'],
      });

      await db.execute({ sql: 'DELETE FROM topics WHERE id = ?', args: ['t1'] });

      const { rows } = await db.execute({ sql: 'SELECT topic_id FROM bookmarks WHERE id = ?', args: ['b1'] });
      expect((rows[0] as any).topic_id).toBeNull();
    });
  });
});
