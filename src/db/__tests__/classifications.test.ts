import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from './test-client';
import {
  createClassification,
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
    title_ar: null,
    title_en: null,
    author_name: 'Test User',
    author_handle: 'testuser',
    tweet_text: 'Check out this article about AI',
    fetched_at: '2024-01-15T10:00:00Z',
  };

  const mockClassification: ClassificationResult = {
    priority: 'high',
    topic: 'AI',
    hashtags: ['machine-learning', 'tutorial'],
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

  describe('createClassification', () => {
    it('stores classification for a bookmark', async () => {
      await createClassification(db, mockBookmark.id, mockClassification);

      const { rows } = await db.execute({
        sql: 'SELECT * FROM classifications WHERE bookmark_id = ?',
        args: [mockBookmark.id],
      });
      const stored = rows[0] as any;
      expect(stored).toBeDefined();
      expect(stored.priority).toBe('high');
      expect(stored.reading_time_min).toBe(5);
    });

    it('creates topic record and links it to bookmark', async () => {
      await createClassification(db, mockBookmark.id, mockClassification);

      const { rows: topicRows } = await db.execute({ sql: 'SELECT name FROM topics ORDER BY name' });
      expect(topicRows.map((t: any) => t.name)).toEqual(['AI']);

      const { rows: bookmarkRows } = await db.execute({
        sql: 'SELECT topic_id FROM bookmarks WHERE id = ?',
        args: [mockBookmark.id],
      });
      expect((bookmarkRows[0] as any).topic_id).toBeDefined();
    });

    it('reuses existing topics', async () => {
      await createClassification(db, mockBookmark.id, mockClassification);

      const { rows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM topics' });
      expect((rows[0] as any).count).toBe(1);
    });

    it('handles empty topic', async () => {
      const result: ClassificationResult = {
        priority: 'low',
        topic: '',
        hashtags: [],
        reading_time_min: 2,
      };

      await createClassification(db, mockBookmark.id, result);

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

    it('returns classification with topic and hashtags', async () => {
      await createClassification(db, mockBookmark.id, mockClassification);

      const result = await getClassification(db, mockBookmark.id);
      expect(result).not.toBeNull();
      expect(result!.priority).toBe('high');
      expect(result!.reading_time_min).toBe(5);
      expect(result!.topic).toBe('AI');
      expect(result!.hashtags).toEqual(['machine-learning', 'tutorial']);
    });
  });

  describe('getClassifiedBookmarks', () => {
    it('returns bookmarks that have been classified', async () => {
      await createClassification(db, mockBookmark.id, mockClassification);

      const result = await getClassifiedBookmarks(db);
      expect(result).toHaveLength(1);
      expect(result[0].bookmark_id).toBe(mockBookmark.id);
      expect(result[0].priority).toBe('high');
      expect(result[0].topic).toBe('AI');
    });

    it('excludes bookmarks without classification', async () => {
      const result = await getClassifiedBookmarks(db);
      expect(result).toHaveLength(0);
    });
  });
});
