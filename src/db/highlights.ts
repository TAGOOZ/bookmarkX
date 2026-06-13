import type { Client } from '@libsql/client';
import type { HighlightRow } from './row-types';
import { mapRow } from './row-types';

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

const HIGHLIGHT_FIELDS: (keyof HighlightRow)[] = ['id', 'bookmark_id', 'selected_text', 'note', 'color', 'created_at'];

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

  return rows.map((row) => {
    const r = mapRow<HighlightRow>(row, HIGHLIGHT_FIELDS);
    return {
      id: r.id,
      bookmark_id: r.bookmark_id,
      selected_text: r.selected_text,
      note: r.note,
      color: r.color,
      created_at: r.created_at,
    };
  });
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
