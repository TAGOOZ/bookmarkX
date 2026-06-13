import type { Client } from '@libsql/client';

export interface HighlightData {
  selected_text: string;
  note: string | null;
  color: string | null;
}

export interface Highlight extends HighlightData {
  id: string;
  bookmark_id: string;
  created_at: string;
}

export async function createHighlight(
  db: Client,
  bookmarkId: string,
  data: HighlightData,
): Promise<void> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO highlights (id, bookmark_id, selected_text, note, color)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, bookmarkId, data.selected_text, data.note, data.color],
  });
}

export async function getHighlights(
  db: Client,
  bookmarkId: string,
): Promise<Highlight[]> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM highlights WHERE bookmark_id = ? ORDER BY created_at ASC',
    args: [bookmarkId],
  });

  return (rows as any[]).map((row) => ({
    id: row.id,
    bookmark_id: row.bookmark_id,
    selected_text: row.selected_text,
    note: row.note,
    color: row.color,
    created_at: row.created_at,
  }));
}

export async function deleteHighlight(
  db: Client,
  highlightId: string,
): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM highlights WHERE id = ?',
    args: [highlightId],
  });
}
