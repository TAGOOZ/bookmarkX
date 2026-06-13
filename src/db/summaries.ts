import type { Client } from '@libsql/client';

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

  const row = rows[0] as any;
  if (!row) return null;

  return {
    id: row.id,
    bookmark_id: row.bookmark_id,
    content_en: row.content_en,
    content_ar: row.content_ar,
    model_used: row.model_used,
    created_at: row.created_at,
  };
}
