import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from './test-client';
import { addTerm, searchTerms, getTermsForBookmark, linkTermToBookmark } from '../glossary';

describe('glossary', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
    await db.execute({
      sql: "INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)",
      args: ['bm-1', 'https://example.com', 'outer_link'],
    });
  });

  afterEach(() => db.close());

  describe('addTerm', () => {
    it('adds a glossary term', async () => {
      const termId = await addTerm(db, 'API', 'Application Programming Interface');
      expect(termId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      const { rows } = await db.execute({
        sql: 'SELECT * FROM glossary_terms WHERE term = ?',
        args: ['API'],
      });
      expect(rows).toHaveLength(1);
      const row = rows[0] as any;
      expect(row.definition).toBe('Application Programming Interface');
    });

    it('rejects duplicate terms', async () => {
      await addTerm(db, 'API', 'First definition');
      await expect(addTerm(db, 'API', 'Second definition')).rejects.toThrow();
    });
  });

  describe('searchTerms', () => {
    it('returns empty array when no matches', async () => {
      const result = await searchTerms(db, 'nonexistent');
      expect(result).toEqual([]);
    });

    it('finds terms by prefix', async () => {
      await addTerm(db, 'API', 'Application Programming Interface');
      await addTerm(db, 'Application', 'A software program');

      const result = await searchTerms(db, 'App');
      expect(result).toHaveLength(1);
      expect(result[0].term).toBe('Application');
    });

    it('returns all terms when query is empty', async () => {
      await addTerm(db, 'API', 'Application Programming Interface');
      await addTerm(db, 'UI', 'User Interface');

      const result = await searchTerms(db, '');
      expect(result).toHaveLength(2);
    });
  });

  describe('linkTermToBookmark', () => {
    it('links a term to a bookmark', async () => {
      const termId = await addTerm(db, 'API', 'Application Programming Interface');
      await linkTermToBookmark(db, 'bm-1', termId);

      const terms = await getTermsForBookmark(db, 'bm-1');
      expect(terms).toHaveLength(1);
      expect(terms[0].term).toBe('API');
    });

    it('does not duplicate links', async () => {
      const termId = await addTerm(db, 'API', 'Application Programming Interface');
      await linkTermToBookmark(db, 'bm-1', termId);
      await linkTermToBookmark(db, 'bm-1', termId);

      const terms = await getTermsForBookmark(db, 'bm-1');
      expect(terms).toHaveLength(1);
    });
  });

  describe('getTermsForBookmark', () => {
    it('returns empty array when no terms linked', async () => {
      const result = await getTermsForBookmark(db, 'bm-1');
      expect(result).toEqual([]);
    });

    it('returns linked terms', async () => {
      const termId = await addTerm(db, 'API', 'Application Programming Interface');
      await linkTermToBookmark(db, 'bm-1', termId);

      const result = await getTermsForBookmark(db, 'bm-1');
      expect(result).toHaveLength(1);
      expect(result[0].term).toBe('API');
      expect(result[0].definition).toBe('Application Programming Interface');
    });
  });
});
