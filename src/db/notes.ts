import type { Client } from '@libsql/client';
import type { NoteRow } from './row-types';
import { mapRow } from './row-types';

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

const NOTE_FIELDS: (keyof NoteRow)[] = ['id', 'bookmark_id', 'title', 'content', 'created_at', 'updated_at'];

export async function createNote(
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

  return rows.map((row) => {
    const r = mapRow<NoteRow>(row, NOTE_FIELDS);
    return {
      id: r.id,
      bookmark_id: r.bookmark_id,
      title: r.title,
      content: r.content,
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });
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
