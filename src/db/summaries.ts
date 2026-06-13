import type { Client } from '@libsql/client';
import type { SummaryRow } from './row-types';
import { mapRow } from './row-types';

export interface SummaryData {
  content_en: string | null;
  content_ar: string | null;
  model_used: string | null;
}

export interface Summary extends SummaryData {
  id: string;
  bookmark_id: string;
  created_at: string;
}

const SUMMARY_FIELDS: (keyof SummaryRow)[] = ['id', 'bookmark_id', 'content_en', 'content_ar', 'model_used', 'created_at'];

export async function createSummary(
  db: Client,
  bookmarkId: string,
  data: SummaryData,
): Promise<void> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO summaries (id, bookmark_id, content_en, content_ar, model_used)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, bookmarkId, data.content_en, data.content_ar, data.model_used],
  });
}

export async function getSummary(
  db: Client,
  bookmarkId: string,
): Promise<Summary | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM summaries WHERE bookmark_id = ? ORDER BY created_at DESC LIMIT 1',
    args: [bookmarkId],
  });

  const row = rows[0];
  if (!row) return null;

  const r = mapRow<SummaryRow>(row, SUMMARY_FIELDS);
  return {
    id: r.id,
    bookmark_id: r.bookmark_id,
    content_en: r.content_en,
    content_ar: r.content_ar,
    model_used: r.model_used,
    created_at: r.created_at,
  };
}
