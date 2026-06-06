import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from './test-client';
import { storeArticleContent, getArticleContent } from '../article-content';

describe('article_content', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
    await db.execute({
      sql: "INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)",
      args: ['bm-1', 'https://example.com', 'outer_link'],
    });
  });

  afterEach(() => db.close());

  describe('storeArticleContent', () => {
    it('stores article content for a bookmark', async () => {
      await storeArticleContent(db, 'bm-1', {
        extracted_text: 'Full article text here...',
        word_count: 1500,
      });

      const { rows } = await db.execute({
        sql: 'SELECT * FROM article_content WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      expect(rows).toHaveLength(1);
      const row = rows[0] as any;
      expect(row.extracted_text).toBe('Full article text here...');
      expect(row.word_count).toBe(1500);
    });

    it('generates a UUID for the article content id', async () => {
      await storeArticleContent(db, 'bm-1', {
        extracted_text: 'Text',
        word_count: 10,
      });

      const { rows } = await db.execute({
        sql: 'SELECT id FROM article_content WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      const row = rows[0] as any;
      expect(row.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('stores blocks_json when provided', async () => {
      const blocks = JSON.stringify([
        { type: 'heading', props: { level: 1 }, content: 'Title' },
        { type: 'paragraph', content: 'Body text' },
      ]);
      await storeArticleContent(db, 'bm-1', {
        extracted_text: 'Title Body text',
        word_count: 3,
        blocks_json: blocks,
      });

      const { rows } = await db.execute({
        sql: 'SELECT blocks_json FROM article_content WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      const row = rows[0] as any;
      expect(row.blocks_json).toBe(blocks);
    });

    it('stores null blocks_json when not provided', async () => {
      await storeArticleContent(db, 'bm-1', {
        extracted_text: 'Text',
        word_count: 1,
      });

      const { rows } = await db.execute({
        sql: 'SELECT blocks_json FROM article_content WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      const row = rows[0] as any;
      expect(row.blocks_json).toBeNull();
    });
  });

  describe('getArticleContent', () => {
    it('returns null when no content exists', async () => {
      const result = await getArticleContent(db, 'bm-1');
      expect(result).toBeNull();
    });

    it('returns the article content for a bookmark', async () => {
      await storeArticleContent(db, 'bm-1', {
        extracted_text: 'Full article text here...',
        word_count: 1500,
      });

      const result = await getArticleContent(db, 'bm-1');
      expect(result).not.toBeNull();
      expect(result!.extracted_text).toBe('Full article text here...');
      expect(result!.word_count).toBe(1500);
    });

    it('returns blocks_json when stored', async () => {
      const blocks = JSON.stringify([
        { type: 'heading', props: { level: 1 }, content: 'Title' },
      ]);
      await storeArticleContent(db, 'bm-1', {
        extracted_text: 'Title',
        word_count: 1,
        blocks_json: blocks,
      });

      const result = await getArticleContent(db, 'bm-1');
      expect(result!.blocks_json).toBe(blocks);
    });

    it('returns undefined blocks_json when not stored', async () => {
      await storeArticleContent(db, 'bm-1', {
        extracted_text: 'Text',
        word_count: 1,
      });

      const result = await getArticleContent(db, 'bm-1');
      expect(result!.blocks_json).toBeUndefined();
    });
  });
});
