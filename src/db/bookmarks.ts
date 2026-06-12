import type { Client } from '@libsql/client';
import type { Bookmark } from '../fetch/types';

export function rowToBookmark(row: any): Bookmark {
  return {
    id: row.id,
    tweet_id: row.tweet_id,
    url: row.url,
    content_type: row.content_type,
    title: row.title,
    title_ar: row.title_ar,
    title_en: row.title_en,
    author_name: row.author_name,
    author_handle: row.author_handle,
    tweet_text: row.tweet_text,
    fetched_at: row.fetched_at,
  };
}

export async function storeBookmarks(db: Client, bookmarks: Bookmark[]): Promise<void> {
  if (bookmarks.length === 0) return;

  const stmts = bookmarks.map((bookmark) => ({
    sql: `INSERT OR IGNORE INTO bookmarks (id, tweet_id, url, content_type, title, title_ar, title_en, author_name, author_handle, tweet_text, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      bookmark.id,
      bookmark.tweet_id,
      bookmark.url,
      bookmark.content_type,
      bookmark.title,
      bookmark.title_ar,
      bookmark.title_en,
      bookmark.author_name,
      bookmark.author_handle,
      bookmark.tweet_text,
      bookmark.fetched_at,
    ],
  }));

  await db.batch(stmts);
}

export async function getStoredBookmarks(db: Client): Promise<Bookmark[]> {
  const { rows } = await db.execute('SELECT * FROM bookmarks ORDER BY created_at DESC');
  return (rows as any[]).map(rowToBookmark);
}

export async function getBookmarkById(
  db: Client,
  id: string
): Promise<Bookmark | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM bookmarks WHERE id = ?',
    args: [id],
  });
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id as string,
    tweet_id: row.tweet_id as string,
    url: row.url as string,
    content_type: row.content_type as Bookmark['content_type'],
    title: row.title as string | null,
    title_ar: row.title_ar as string | null,
    title_en: row.title_en as string | null,
    author_name: row.author_name as string | null,
    author_handle: row.author_handle as string | null,
    tweet_text: row.tweet_text as string | null,
    fetched_at: row.fetched_at as string,
  };
}

export async function getUnclassifiedBookmarks(db: Client): Promise<Bookmark[]> {
  const { rows } = await db.execute(`
    SELECT b.* FROM bookmarks b
    LEFT JOIN classifications c ON b.id = c.bookmark_id
    WHERE c.id IS NULL
    ORDER BY b.created_at DESC
  `);

  return (rows as any[]).map(rowToBookmark);
}
