import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../schema';
import {
  storeClassification,
  getClassification,
  getClassifiedBookmarks,
} from '../classifications';
import type { ClassificationResult } from '../../classify/types';
import type { Bookmark } from '../../fetch/types';

describe('Classification CRUD', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
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

  beforeEach(() => {
    db.prepare(
      'INSERT INTO bookmarks (id, tweet_id, url, content_type, title, author_name, author_handle, tweet_text, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      mockBookmark.id,
      mockBookmark.tweet_id,
      mockBookmark.url,
      mockBookmark.content_type,
      mockBookmark.title,
      mockBookmark.author_name,
      mockBookmark.author_handle,
      mockBookmark.tweet_text,
      mockBookmark.fetched_at
    );
  });

  describe('storeClassification', () => {
    it('stores classification for a bookmark', () => {
      storeClassification(db, mockBookmark.id, mockClassification);

      const stored = db
        .prepare('SELECT * FROM classifications WHERE bookmark_id = ?')
        .get(mockBookmark.id) as any;
      expect(stored).toBeDefined();
      expect(stored.priority).toBe('high');
      expect(stored.reading_time_min).toBe(5);
    });

    it('creates topic records and links them to bookmark', () => {
      storeClassification(db, mockBookmark.id, mockClassification);

      const topics = db.prepare('SELECT name FROM topics ORDER BY name').all() as any[];
      expect(topics.map((t) => t.name)).toEqual(['AI', 'Machine Learning']);

      const bookmarkTopics = db
        .prepare('SELECT topic_id FROM bookmark_topics WHERE bookmark_id = ?')
        .all(mockBookmark.id);
      expect(bookmarkTopics).toHaveLength(2);
    });

    it('reuses existing topics', () => {
      storeClassification(db, mockBookmark.id, mockClassification);

      const topicsCount = db.prepare('SELECT COUNT(*) as count FROM topics').get() as any;
      expect(topicsCount.count).toBe(2);
    });

    it('handles empty topics array', () => {
      const result: ClassificationResult = {
        priority: 'low',
        topics: [],
        reading_time_min: 2,
      };

      storeClassification(db, mockBookmark.id, result);

      const stored = db
        .prepare('SELECT * FROM classifications WHERE bookmark_id = ?')
        .get(mockBookmark.id) as any;
      expect(stored.priority).toBe('low');
    });
  });

  describe('getClassification', () => {
    it('returns null when no classification exists', () => {
      const result = getClassification(db, mockBookmark.id);
      expect(result).toBeNull();
    });

    it('returns classification with topics', () => {
      storeClassification(db, mockBookmark.id, mockClassification);

      const result = getClassification(db, mockBookmark.id);
      expect(result).not.toBeNull();
      expect(result!.priority).toBe('high');
      expect(result!.reading_time_min).toBe(5);
      expect(result!.topics).toEqual(['AI', 'Machine Learning']);
    });
  });

  describe('getClassifiedBookmarks', () => {
    it('returns bookmarks that have been classified', () => {
      storeClassification(db, mockBookmark.id, mockClassification);

      const result = getClassifiedBookmarks(db);
      expect(result).toHaveLength(1);
      expect(result[0].bookmark_id).toBe(mockBookmark.id);
      expect(result[0].priority).toBe('high');
    });

    it('excludes bookmarks without classification', () => {
      const result = getClassifiedBookmarks(db);
      expect(result).toHaveLength(0);
    });
  });
});
