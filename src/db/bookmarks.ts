import type { Client } from '@libsql/client';
import type { Bookmark } from '../fetch/types';

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
  return (rows as any[]).map((row) => ({
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
  }));
}

export async function getUnfetchedBookmarks(db: Client): Promise<Bookmark[]> {
  const { rows } = await db.execute(`
    SELECT b.* FROM bookmarks b
    LEFT JOIN classifications c ON b.id = c.bookmark_id
    WHERE c.id IS NULL
    ORDER BY b.created_at DESC
  `);

  return (rows as any[]).map((row) => ({
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
  }));
}
