import type { Client } from '@libsql/client';

export interface NoteData {
  title: string | null;
  content: string | null;
}

export interface Note extends NoteData {
  id: string;
  bookmark_id: string;
  created_at: string;
  updated_at: string;
}

export async function storeNote(
  db: Client,
  bookmarkId: string,
  data: NoteData,
): Promise<void> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: `INSERT INTO notes (id, bookmark_id, title, content)
          VALUES (?, ?, ?, ?)`,
    args: [id, bookmarkId, data.title, data.content],
  });
}

export async function getNotes(
  db: Client,
  bookmarkId: string,
): Promise<Note[]> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM notes WHERE bookmark_id = ? ORDER BY created_at ASC',
    args: [bookmarkId],
  });

  return (rows as any[]).map((row) => ({
    id: row.id,
    bookmark_id: row.bookmark_id,
    title: row.title,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function updateNote(
  db: Client,
  noteId: string,
  data: NoteData,
): Promise<void> {
  await db.execute({
    sql: `UPDATE notes SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?`,
    args: [data.title, data.content, noteId],
  });
}

export async function deleteNote(
  db: Client,
  noteId: string,
): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM notes WHERE id = ?',
    args: [noteId],
  });
}
