import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from './test-client';
import { createSummary, getSummary } from '../summaries';

describe('summaries', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
    await db.execute({
      sql: "INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)",
      args: ['bm-1', 'https://example.com', 'outer_link'],
    });
  });

  afterEach(() => db.close());

  describe('createSummary', () => {
    it('stores a summary for a bookmark', async () => {
      await createSummary(db, 'bm-1', {
        content_en: 'English summary',
        content_ar: 'Arabic summary',
        model_used: 'gemini-2.0-flash',
      });

      const { rows } = await db.execute({
        sql: 'SELECT * FROM summaries WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      expect(rows).toHaveLength(1);
      const row = rows[0] as any;
      expect(row.content_en).toBe('English summary');
      expect(row.content_ar).toBe('Arabic summary');
      expect(row.model_used).toBe('gemini-2.0-flash');
    });

    it('generates a UUID for the summary id', async () => {
      await createSummary(db, 'bm-1', {
        content_en: 'Summary',
        content_ar: null,
        model_used: 'gemini-2.0-flash',
      });

      const { rows } = await db.execute({
        sql: 'SELECT id FROM summaries WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      const row = rows[0] as any;
      expect(row.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('getSummary', () => {
    it('returns null when no summary exists', async () => {
      const result = await getSummary(db, 'bm-1');
      expect(result).toBeNull();
    });

    it('returns the summary for a bookmark', async () => {
      await createSummary(db, 'bm-1', {
        content_en: 'English summary',
        content_ar: 'Arabic summary',
        model_used: 'gemini-2.0-flash',
      });

      const result = await getSummary(db, 'bm-1');
      expect(result).not.toBeNull();
      expect(result!.content_en).toBe('English summary');
      expect(result!.content_ar).toBe('Arabic summary');
      expect(result!.model_used).toBe('gemini-2.0-flash');
    });
  });
});
