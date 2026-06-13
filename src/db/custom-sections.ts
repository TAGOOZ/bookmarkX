import type { Client } from '@libsql/client';
import type { CustomSectionRow, MaxOrderRow } from './row-types';
import { mapRow } from './row-types';

export interface CustomSection {
  id: string;
  bookmark_id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const CUSTOM_SECTION_FIELDS: (keyof CustomSectionRow)[] = ['id', 'bookmark_id', 'title', 'content', 'sort_order', 'created_at', 'updated_at'];

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
  const sortOrder = maxOrder.rows[0] ? mapRow<MaxOrderRow>(maxOrder.rows[0], ['next_order']).next_order : 0;
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
  return rows.map((row) => {
    const r = mapRow<CustomSectionRow>(row, CUSTOM_SECTION_FIELDS);
    return {
      id: r.id,
      bookmark_id: r.bookmark_id,
      title: r.title,
      content: r.content,
      sort_order: r.sort_order,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });
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
    args,
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
