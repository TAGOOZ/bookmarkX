import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../schema';
import { storeBookmarks, getStoredBookmarks, getUnfetchedBookmarks } from '../bookmarks';
import type { Bookmark } from '../../fetch/types';

describe('Bookmark CRUD', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
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
    author_name: 'Another User',
    author_handle: 'anotheruser',
    tweet_text: 'Thread about testing',
    fetched_at: '2024-01-15T11:00:00Z',
  };

  describe('storeBookmarks', () => {
    it('inserts a single bookmark into the database', () => {
      storeBookmarks(db, [mockBookmark]);

      const stored = db.prepare('SELECT * FROM bookmarks WHERE tweet_id = ?').get(mockBookmark.tweet_id) as any;
      expect(stored).toBeDefined();
      expect(stored.tweet_id).toBe(mockBookmark.tweet_id);
      expect(stored.url).toBe(mockBookmark.url);
      expect(stored.content_type).toBe(mockBookmark.content_type);
      expect(stored.title).toBe(mockBookmark.title);
      expect(stored.author_name).toBe(mockBookmark.author_name);
      expect(stored.author_handle).toBe(mockBookmark.author_handle);
      expect(stored.tweet_text).toBe(mockBookmark.tweet_text);
    });

    it('inserts multiple bookmarks', () => {
      storeBookmarks(db, [mockBookmark, mockBookmark2]);

      const count = db.prepare('SELECT COUNT(*) as count FROM bookmarks').get() as any;
      expect(count.count).toBe(2);
    });

    it('skips duplicate tweet_ids', () => {
      storeBookmarks(db, [mockBookmark]);
      storeBookmarks(db, [mockBookmark]);

      const count = db.prepare('SELECT COUNT(*) as count FROM bookmarks').get() as any;
      expect(count.count).toBe(1);
    });

    it('handles empty array', () => {
      storeBookmarks(db, []);

      const count = db.prepare('SELECT COUNT(*) as count FROM bookmarks').get() as any;
      expect(count.count).toBe(0);
    });
  });

  describe('getStoredBookmarks', () => {
    it('returns empty array when no bookmarks stored', () => {
      const result = getStoredBookmarks(db);
      expect(result).toEqual([]);
    });

    it('returns all stored bookmarks', () => {
      storeBookmarks(db, [mockBookmark, mockBookmark2]);

      const result = getStoredBookmarks(db);
      expect(result).toHaveLength(2);
      expect(result[0].tweet_id).toBe(mockBookmark.tweet_id);
      expect(result[1].tweet_id).toBe(mockBookmark2.tweet_id);
    });

    it('returns bookmarks with correct structure', () => {
      storeBookmarks(db, [mockBookmark]);

      const result = getStoredBookmarks(db);
      expect(result[0]).toMatchObject({
        id: mockBookmark.id,
        tweet_id: mockBookmark.tweet_id,
        url: mockBookmark.url,
        content_type: mockBookmark.content_type,
      });
    });
  });

  describe('getUnfetchedBookmarks', () => {
    it('returns empty array when no bookmarks stored', () => {
      const result = getUnfetchedBookmarks(db);
      expect(result).toEqual([]);
    });

    it('returns all bookmarks when none have been classified', () => {
      storeBookmarks(db, [mockBookmark, mockBookmark2]);

      const result = getUnfetchedBookmarks(db);
      expect(result).toHaveLength(2);
    });

    it('excludes bookmarks that have been classified', () => {
      storeBookmarks(db, [mockBookmark, mockBookmark2]);

      // Add a classification for the first bookmark
      db.prepare(
        'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)'
      ).run('class-1', mockBookmark.id, 'high', 5);

      const result = getUnfetchedBookmarks(db);
      expect(result).toHaveLength(1);
      expect(result[0].tweet_id).toBe(mockBookmark2.tweet_id);
    });

    it('returns all bookmarks when all have been classified', () => {
      storeBookmarks(db, [mockBookmark, mockBookmark2]);

      db.prepare(
        'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)'
      ).run('class-1', mockBookmark.id, 'high', 5);

      db.prepare(
        'INSERT INTO classifications (id, bookmark_id, priority, reading_time_min) VALUES (?, ?, ?, ?)'
      ).run('class-2', mockBookmark2.id, 'low', 10);

      const result = getUnfetchedBookmarks(db);
      expect(result).toHaveLength(0);
    });
  });
});
