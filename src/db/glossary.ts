import type { Client } from '@libsql/client';
import type { GlossaryTermRow } from './row-types';
import { mapRow } from './row-types';

export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  created_at: string;
}

const GLOSSARY_FIELDS: (keyof GlossaryTermRow)[] = ['id', 'term', 'definition', 'created_at'];

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

export async function batchAddTermsAndLink(
  db: Client,
  bookmarkId: string,
  terms: Array<{ term: string; definition: string }>,
): Promise<string[]> {
  const ids = terms.map(() => crypto.randomUUID());
  const stmts = [
    ...terms.map((t, i) => ({
      sql: 'INSERT INTO glossary_terms (id, term, definition) VALUES (?, ?, ?)',
      args: [ids[i], t.term, t.definition] as (string | number | null)[],
    })),
    ...ids.map((id) => ({
      sql: 'INSERT OR IGNORE INTO bookmark_glossary (bookmark_id, term_id) VALUES (?, ?)',
      args: [bookmarkId, id] as (string | number | null)[],
    })),
  ];
  await db.batch(stmts);
  return ids;
}

export async function searchTerms(
  db: Client,
  query: string,
): Promise<GlossaryTerm[]> {
  if (query === '') {
    const { rows } = await db.execute(
      'SELECT * FROM glossary_terms ORDER BY term ASC',
    );
    return rows.map((row) => {
      const r = mapRow<GlossaryTermRow>(row, GLOSSARY_FIELDS);
      return { id: r.id, term: r.term, definition: r.definition, created_at: r.created_at };
    });
  }

  const { rows } = await db.execute({
    sql: 'SELECT * FROM glossary_terms WHERE term LIKE ? ORDER BY term ASC',
    args: [`${query}%`],
  });

  return rows.map((row) => {
    const r = mapRow<GlossaryTermRow>(row, GLOSSARY_FIELDS);
    return { id: r.id, term: r.term, definition: r.definition, created_at: r.created_at };
  });
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

  return rows.map((row) => {
    const r = mapRow<GlossaryTermRow>(row, GLOSSARY_FIELDS);
    return { id: r.id, term: r.term, definition: r.definition, created_at: r.created_at };
  });
}

export async function getAllTerms(
  db: Client,
): Promise<GlossaryTerm[]> {
  const { rows } = await db.execute(
    'SELECT * FROM glossary_terms ORDER BY term ASC',
  );
  return rows.map((row) => {
    const r = mapRow<GlossaryTermRow>(row, GLOSSARY_FIELDS);
    return { id: r.id, term: r.term, definition: r.definition, created_at: r.created_at };
  });
}

export async function deleteTerm(
  db: Client,
  termId: string,
): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM bookmark_glossary WHERE term_id = ?',
    args: [termId],
  });
  await db.execute({
    sql: 'DELETE FROM glossary_terms WHERE id = ?',
    args: [termId],
  });
}

export async function exportGlossaryMarkdown(
  db: Client,
  bookmarkId?: string,
): Promise<string> {
  const terms = bookmarkId
    ? await getTermsForBookmark(db, bookmarkId)
    : await getAllTerms(db);
  const lines = terms.map((t) => `**${t.term}**: ${t.definition}`);
  return `# Glossary\n\n${lines.join('\n\n')}`;
}

export async function exportGlossaryJson(
  db: Client,
  bookmarkId?: string,
): Promise<string> {
  const terms = bookmarkId
    ? await getTermsForBookmark(db, bookmarkId)
    : await getAllTerms(db);
  return JSON.stringify(terms, null, 2);
}
