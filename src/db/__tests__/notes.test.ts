import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from './test-client';
import { storeNote, getNotes, updateNote, deleteNote } from '../notes';

describe('notes', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
    await db.execute({
      sql: "INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)",
      args: ['bm-1', 'https://example.com', 'outer_link'],
    });
  });

  afterEach(() => db.close());

  describe('storeNote', () => {
    it('stores a note for a bookmark', async () => {
      await storeNote(db, 'bm-1', {
        title: 'My Note',
        content: '{"type":"doc","content":[]}',
      });

      const { rows } = await db.execute({
        sql: 'SELECT * FROM notes WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      expect(rows).toHaveLength(1);
      const row = rows[0] as any;
      expect(row.title).toBe('My Note');
      expect(row.content).toBe('{"type":"doc","content":[]}');
    });

    it('generates a UUID for the note id', async () => {
      await storeNote(db, 'bm-1', { title: 'Note', content: '{}' });

      const { rows } = await db.execute({
        sql: 'SELECT id FROM notes WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      const row = rows[0] as any;
      expect(row.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('getNotes', () => {
    it('returns empty array when no notes exist', async () => {
      const result = await getNotes(db, 'bm-1');
      expect(result).toEqual([]);
    });

    it('returns all notes for a bookmark', async () => {
      await storeNote(db, 'bm-1', { title: 'First', content: '{}' });
      await storeNote(db, 'bm-1', { title: 'Second', content: '{}' });

      const result = await getNotes(db, 'bm-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('updateNote', () => {
    it('updates note title and content', async () => {
      await storeNote(db, 'bm-1', { title: 'Old Title', content: 'old' });
      const { rows } = await db.execute({
        sql: 'SELECT id FROM notes WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      const noteId = (rows[0] as any).id;

      await updateNote(db, noteId, { title: 'New Title', content: 'new' });

      const updated = await db.execute({
        sql: 'SELECT * FROM notes WHERE id = ?',
        args: [noteId],
      });
      const row = updated.rows[0] as any;
      expect(row.title).toBe('New Title');
      expect(row.content).toBe('new');
    });
  });

  describe('deleteNote', () => {
    it('removes a note by id', async () => {
      await storeNote(db, 'bm-1', { title: 'To delete', content: '{}' });
      const { rows } = await db.execute({
        sql: 'SELECT id FROM notes WHERE bookmark_id = ?',
        args: ['bm-1'],
      });
      const noteId = (rows[0] as any).id;

      await deleteNote(db, noteId);

      const remaining = await getNotes(db, 'bm-1');
      expect(remaining).toHaveLength(0);
    });
  });
});
