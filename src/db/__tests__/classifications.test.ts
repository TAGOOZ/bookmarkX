import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from './test-client';
import {
  storeClassification,
  getClassification,
  getClassifiedBookmarks,
} from '../classifications';
import type { ClassificationResult } from '../../classify/types';
import type { Bookmark } from '../../fetch/types';

describe('Classification CRUD', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  const mockBookmark: Bookmark = {
    id: 'class-bm-1',
    tweet_id: '111111',
    url: 'https://x.com/user/status/111111',
    content_type: 'outer_link',
    title: 'Test Article',
    author_name: 'Test User',
    author_handle: 'testuser',
    tweet_text: 'Check out this article about AI',
    fetched_at: '2024-01-15T10:00:00Z',
  };

  const mockClassification: ClassificationResult = {
    priority: 'high',
    topics: ['AI', 'Machine Learning'],
    reading_time_min: 5,
  };

  beforeEach(async () => {
    await db.execute({
      sql: 'INSERT INTO bookmarks (id, tweet_id, url, content_type, title, author_name, author_handle, tweet_text, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [
        mockBookmark.id,
        mockBookmark.tweet_id,
        mockBookmark.url,
        mockBookmark.content_type,
        mockBookmark.title,
        mockBookmark.author_name,
        mockBookmark.author_handle,
        mockBookmark.tweet_text,
        mockBookmark.fetched_at,
      ],
    });
  });

  describe('storeClassification', () => {
    it('stores classification for a bookmark', async () => {
      await storeClassification(db, mockBookmark.id, mockClassification);

      const { rows } = await db.execute({
        sql: 'SELECT * FROM classifications WHERE bookmark_id = ?',
        args: [mockBookmark.id],
      });
      const stored = rows[0] as any;
      expect(stored).toBeDefined();
      expect(stored.priority).toBe('high');
      expect(stored.reading_time_min).toBe(5);
    });

    it('creates topic records and links them to bookmark', async () => {
      await storeClassification(db, mockBookmark.id, mockClassification);

      const { rows: topicRows } = await db.execute({ sql: 'SELECT name FROM topics ORDER BY name' });
      expect(topicRows.map((t: any) => t.name)).toEqual(['AI', 'Machine Learning']);

      const { rows: linkRows } = await db.execute({
        sql: 'SELECT topic_id FROM bookmark_topics WHERE bookmark_id = ?',
        args: [mockBookmark.id],
      });
      expect(linkRows).toHaveLength(2);
    });

    it('reuses existing topics', async () => {
      await storeClassification(db, mockBookmark.id, mockClassification);

      const { rows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM topics' });
      expect((rows[0] as any).count).toBe(2);
    });

    it('handles empty topics array', async () => {
      const result: ClassificationResult = {
        priority: 'low',
        topics: [],
        reading_time_min: 2,
      };

      await storeClassification(db, mockBookmark.id, result);

      const { rows } = await db.execute({
        sql: 'SELECT * FROM classifications WHERE bookmark_id = ?',
        args: [mockBookmark.id],
      });
      expect((rows[0] as any).priority).toBe('low');
    });
  });

  describe('getClassification', () => {
    it('returns null when no classification exists', async () => {
      const result = await getClassification(db, mockBookmark.id);
      expect(result).toBeNull();
    });

    it('returns classification with topics', async () => {
      await storeClassification(db, mockBookmark.id, mockClassification);

      const result = await getClassification(db, mockBookmark.id);
      expect(result).not.toBeNull();
      expect(result!.priority).toBe('high');
      expect(result!.reading_time_min).toBe(5);
      expect(result!.topics).toEqual(['AI', 'Machine Learning']);
    });
  });

  describe('getClassifiedBookmarks', () => {
    it('returns bookmarks that have been classified', async () => {
      await storeClassification(db, mockBookmark.id, mockClassification);

      const result = await getClassifiedBookmarks(db);
      expect(result).toHaveLength(1);
      expect(result[0].bookmark_id).toBe(mockBookmark.id);
      expect(result[0].priority).toBe('high');
    });

    it('excludes bookmarks without classification', async () => {
      const result = await getClassifiedBookmarks(db);
      expect(result).toHaveLength(0);
    });
  });
});
