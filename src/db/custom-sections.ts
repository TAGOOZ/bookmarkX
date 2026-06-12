import type { Client } from '@libsql/client';

export interface CustomSection {
  id: string;
  bookmark_id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function createCustomSection(
  db: Client,
  bookmarkId: string,
  title: string,
  content: string = '',
): Promise<string> {
  const id = crypto.randomUUID();
  const maxOrder = await db.execute({
    sql: 'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM custom_sections WHERE bookmark_id = ?',
    args: [bookmarkId],
  });
  const sortOrder = (maxOrder.rows[0] as any)?.next_order ?? 0;
  await db.execute({
    sql: `INSERT INTO custom_sections (id, bookmark_id, title, content, sort_order)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, bookmarkId, title, content, sortOrder],
  });
  return id;
}

export async function getCustomSections(
  db: Client,
  bookmarkId: string,
): Promise<CustomSection[]> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM custom_sections WHERE bookmark_id = ? ORDER BY sort_order ASC',
    args: [bookmarkId],
  });
  return (rows as any[]).map((row) => ({
    id: row.id,
    bookmark_id: row.bookmark_id,
    title: row.title,
    content: row.content,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function updateCustomSection(
  db: Client,
  sectionId: string,
  data: { title?: string; content?: string },
): Promise<void> {
  const sets: string[] = [];
  const args: (string | number | null)[] = [];
  if (data.title !== undefined) {
    sets.push('title = ?');
    args.push(data.title);
  }
  if (data.content !== undefined) {
    sets.push('content = ?');
    args.push(data.content);
  }
  if (sets.length === 0) return;
  sets.push('updated_at = CURRENT_TIMESTAMP');
  args.push(sectionId);
  await db.execute({
    sql: `UPDATE custom_sections SET ${sets.join(', ')} WHERE id = ?`,
    args: args as any,
  });
}

export async function deleteCustomSection(
  db: Client,
  sectionId: string,
): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM custom_sections WHERE id = ?',
    args: [sectionId],
  });
}

export async function reorderCustomSections(
  db: Client,
  orderedIds: string[],
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await db.execute({
      sql: 'UPDATE custom_sections SET sort_order = ? WHERE id = ?',
      args: [i, orderedIds[i]],
    });
  }
}
