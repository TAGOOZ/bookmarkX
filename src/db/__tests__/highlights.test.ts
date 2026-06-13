import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from './test-client';
import { createHighlight, getHighlights, deleteHighlight } from '../highlights';

describe('highlights', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
    await db.execute({
      sql: "INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)",
      args: ['bm-1', 'https://example.com', 'outer_link'],
    });
  });

  afterEach(() => db.close());

  describe('createHighlight', () => {
    it('stores a highlight with selected text', async () => {
      await createHighlight(db, 'bm-1', {
        selected_text: 'Important quote',
        note: 'Remember this',
        color: '#ff0000',
      });

      const { rows } = await db.execute({
        sql: 'SELECT * FROM highlights WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      expect(rows).toHaveLength(1);
      const row = rows[0] as any;
      expect(row.selected_text).toBe('Important quote');
      expect(row.note).toBe('Remember this');
      expect(row.color).toBe('#ff0000');
    });

    it('generates a UUID for the highlight id', async () => {
      await createHighlight(db, 'bm-1', {
        selected_text: 'Text',
        note: null,
        color: '#e69819',
      });

      const { rows } = await db.execute({
        sql: 'SELECT id FROM highlights WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      const row = rows[0] as any;
      expect(row.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('getHighlights', () => {
    it('returns empty array when no highlights exist', async () => {
      const result = await getHighlights(db, 'bm-1');
      expect(result).toEqual([]);
    });

    it('returns all highlights for a bookmark', async () => {
      await createHighlight(db, 'bm-1', { selected_text: 'First', note: null, color: '#ff0000' });
      await createHighlight(db, 'bm-1', { selected_text: 'Second', note: 'Note', color: '#00ff00' });

      const result = await getHighlights(db, 'bm-1');
      expect(result).toHaveLength(2);
      expect(result.map((h) => h.selected_text)).toEqual(['First', 'Second']);
    });
  });

  describe('deleteHighlight', () => {
    it('removes a highlight by id', async () => {
      await createHighlight(db, 'bm-1', { selected_text: 'To delete', note: null, color: '#ff0000' });
      const { rows } = await db.execute({
        sql: 'SELECT id FROM highlights WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      const highlightId = (rows[0] as any).id;

      await deleteHighlight(db, highlightId);

      const remaining = await getHighlights(db, 'bm-1');
      expect(remaining).toHaveLength(0);
    });
  });
});
