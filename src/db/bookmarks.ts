import type { Client, Row } from '@libsql/client';
import type { Bookmark } from '../fetch/types';
import type { BookmarkRow } from './row-types';
import { mapRow } from './row-types';

const BOOKMARK_FIELDS: (keyof BookmarkRow)[] = [
  'id', 'tweet_id', 'url', 'content_type',
  'title', 'title_ar', 'title_en',
  'author_name', 'author_handle', 'tweet_text',
  'topic_id', 'fetched_at',
];

export function rowToBookmark(row: Row): Bookmark {
  const r = mapRow<BookmarkRow>(row, BOOKMARK_FIELDS);
  return {
    id: r.id,
    tweet_id: r.tweet_id,
    url: r.url,
    content_type: r.content_type as Bookmark['content_type'],
    title: r.title,
    title_ar: r.title_ar,
    title_en: r.title_en,
    author_name: r.author_name,
    author_handle: r.author_handle,
    tweet_text: r.tweet_text,
    fetched_at: r.fetched_at,
  };
}

export async function createBookmarks(db: Client, bookmarks: Bookmark[]): Promise<void> {
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
  return rows.map((row) => rowToBookmark(row));
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
  const r = mapRow<BookmarkRow>(row, BOOKMARK_FIELDS);
  return {
    id: r.id,
    tweet_id: r.tweet_id,
    url: r.url,
    content_type: r.content_type as Bookmark['content_type'],
    title: r.title,
    title_ar: r.title_ar,
    title_en: r.title_en,
    author_name: r.author_name,
    author_handle: r.author_handle,
    tweet_text: r.tweet_text,
    fetched_at: r.fetched_at,
  };
}

export async function getUnclassifiedBookmarks(db: Client): Promise<Bookmark[]> {
  const { rows } = await db.execute(`
    SELECT b.* FROM bookmarks b
    LEFT JOIN classifications c ON b.id = c.bookmark_id
    WHERE c.id IS NULL
    ORDER BY b.created_at DESC
  `);

  return rows.map((row) => rowToBookmark(row));
}
