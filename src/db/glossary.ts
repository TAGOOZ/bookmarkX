import type { Client } from '@libsql/client';

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  created_at: string;
}

export async function addTerm(
  db: Client,
  term: string,
  definition: string,
): Promise<string> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: 'INSERT INTO glossary_terms (id, term, definition) VALUES (?, ?, ?)',
    args: [id, term, definition],
  });
  return id;
}

export async function searchTerms(
  db: Client,
  query: string,
): Promise<GlossaryTerm[]> {
  if (query === '') {
    const { rows } = await db.execute(
      'SELECT * FROM glossary_terms ORDER BY term ASC',
    );
    return (rows as any[]).map((row) => ({
      id: row.id,
      term: row.term,
      definition: row.definition,
      created_at: row.created_at,
    }));
  }

  const { rows } = await db.execute({
    sql: 'SELECT * FROM glossary_terms WHERE term LIKE ? ORDER BY term ASC',
    args: [`${query}%`],
  });

  return (rows as any[]).map((row) => ({
    id: row.id,
    term: row.term,
    definition: row.definition,
    created_at: row.created_at,
  }));
}

export async function linkTermToBookmark(
  db: Client,
  bookmarkId: string,
  termId: string,
): Promise<void> {
  await db.execute({
    sql: 'INSERT OR IGNORE INTO bookmark_glossary (bookmark_id, term_id) VALUES (?, ?)',
    args: [bookmarkId, termId],
  });
}

export async function getTermsForBookmark(
  db: Client,
  bookmarkId: string,
): Promise<GlossaryTerm[]> {
  const { rows } = await db.execute({
    sql: `SELECT gt.* FROM glossary_terms gt
          JOIN bookmark_glossary bg ON gt.id = bg.term_id
          WHERE bg.bookmark_id = ?
          ORDER BY gt.term ASC`,
    args: [bookmarkId],
  });

  return (rows as any[]).map((row) => ({
    id: row.id,
    term: row.term,
    definition: row.definition,
    created_at: row.created_at,
  }));
}
