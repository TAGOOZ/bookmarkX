import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from './test-client';
import { storeBookmarks, getStoredBookmarks, getUnclassifiedBookmarks } from '../bookmarks';
import type { Bookmark } from '../../fetch/types';

describe('Bookmark CRUD', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  const mockBookmark: Bookmark = {
    id: 'test-id-1',
    tweet_id: '123456789',
    url: 'https://x.com/user/status/123456789',
    content_type: 'outer_link',
    title: 'Test Article',
    title_ar: null,
    title_en: null,
    author_name: 'Test User',
    author_handle: 'testuser',
    tweet_text: 'Check out this article',
    fetched_at: '2024-01-15T10:00:00Z',
  };

  const mockBookmark2: Bookmark = {
    id: 'test-id-2',
    tweet_id: '987654321',
    url: 'https://x.com/user/status/987654321',
    content_type: 'thread',
    title: null,
    title_ar: null,
    title_en: null,
    author_name: 'Another User',
    author_handle: 'anotheruser',
    tweet_text: 'Thread about testing',
    fetched_at: '2024-01-15T11:00:00Z',
  };

  describe('storeBookmarks', () => {
    it('inserts a single bookmark into the database', async () => {
      await storeBookmarks(db, [mockBookmark]);

      const { rows } = await db.execute({
        sql: 'SELECT * FROM bookmarks WHERE tweet_id = ?',
        args: [mockBookmark.tweet_id],
      });
      const stored = rows[0] as any;
      expect(stored).toBeDefined();
      expect(stored.tweet_id).toBe(mockBookmark.tweet_id);
      expect(stored.url).toBe(mockBookmark.url);
      expect(stored.content_type).toBe(mockBookmark.content_type);
      expect(stored.title).toBe(mockBookmark.title);
      expect(stored.author_name).toBe(mockBookmark.author_name);
      expect(stored.author_handle).toBe(mockBookmark.author_handle);
      expect(stored.tweet_text).toBe(mockBookmark.tweet_text);
    });

    it('inserts multiple bookmarks', async () => {
      await storeBookmarks(db, [mockBookmark, mockBookmark2]);

      const { rows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM bookmarks' });
      expect((rows[0] as any).count).toBe(2);
    });

    it('skips duplicate tweet_ids', async () => {
      await storeBookmarks(db, [mockBookmark]);
      await storeBookmarks(db, [mockBookmark]);

      const { rows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM bookmarks' });
      expect((rows[0] as any).count).toBe(1);
    });

    it('handles empty array', async () => {
      await storeBookmarks(db, []);

      const { rows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM bookmarks' });
      expect((rows[0] as any).count).toBe(0);
    });
  });

  describe('getStoredBookmarks', () => {
    it('returns empty array when no bookmarks stored', async () => {
      const result = await getStoredBookmarks(db);
      expect(result).toEqual([]);
    });

    it('returns all stored bookmarks', async () => {
      await storeBookmarks(db, [mockBookmark, mockBookmark2]);

      const result = await getStoredBookmarks(db);
      expect(result).toHaveLength(2);
      expect(result[0].tweet_id).toBe(mockBookmark.tweet_id);
      expect(result[1].tweet_id).toBe(mockBookmark2.tweet_id);
    });

    it('returns bookmarks with correct structure', async () => {
      await storeBookmarks(db, [mockBookmark]);

      const result = await getStoredBookmarks(db);
      expect(result[0]).toMatchObject({
        id: mockBookmark.id,
        tweet_id: mockBookmark.tweet_id,
        url: mockBookmark.url,
        content_type: mockBookmark.content_type,
      });
    });
  });

  describe('getUnclassifiedBookmarks', () => {
    it('returns empty array when no bookmarks stored', async () => {
      const result = await getUnclassifiedBookmarks(db);
      expect(result).toEqual([]);
    });

    it('returns all bookmarks when none have been classified', async () => {
      await storeBookmarks(db, [mockBookmark, mockBookmark2]);

      const result = await getUnclassifiedBookmarks(db);
      expect(result).toHaveLength(2);
    });

    it('excludes bookmarks that have been classified', async () => {
      await storeBookmarks(db, [mockBookmark, mockBookmark2]);

      await db.execute({
        sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
        args: ['class-1', mockBookmark.id, 'high', 5],
      });

      const result = await getUnclassifiedBookmarks(db);
      expect(result).toHaveLength(1);
      expect(result[0].tweet_id).toBe(mockBookmark2.tweet_id);
    });

    it('returns all bookmarks when all have been classified', async () => {
      await storeBookmarks(db, [mockBookmark, mockBookmark2]);

      await db.execute({
        sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
        args: ['class-1', mockBookmark.id, 'high', 5],
      });

      await db.execute({
        sql: 'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)',
        args: ['class-2', mockBookmark2.id, 'low', 10],
      });

      const result = await getUnclassifiedBookmarks(db);
      expect(result).toHaveLength(0);
    });
  });
});
