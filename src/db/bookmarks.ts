import Database from 'better-sqlite3';
import type { Bookmark } from '../fetch/types';

export function storeBookmarks(db: Database.Database, bookmarks: Bookmark[]): void {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO bookmarks (id, tweet_id, url, content_type, title, author_name, author_handle, tweet_text, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: Bookmark[]) => {
    for (const bookmark of items) {
      insert.run(
        bookmark.id,
        bookmark.tweet_id,
        bookmark.url,
        bookmark.content_type,
        bookmark.title,
        bookmark.author_name,
        bookmark.author_handle,
        bookmark.tweet_text,
        bookmark.fetched_at
      );
    }
  });

  insertMany(bookmarks);
}

export function getStoredBookmarks(db: Database.Database): Bookmark[] {
  const rows = db.prepare('SELECT * FROM bookmarks ORDER BY created_at DESC').all() as any[];
  return rows.map(row => ({
    id: row.id,
    tweet_id: row.tweet_id,
    url: row.url,
    content_type: row.content_type,
    title: row.title,
    author_name: row.author_name,
    author_handle: row.author_handle,
    tweet_text: row.tweet_text,
    fetched_at: row.fetched_at,
  }));
}

export function getUnfetchedBookmarks(db: Database.Database): Bookmark[] {
  const rows = db.prepare(`
    SELECT b.* FROM bookmarks b
    LEFT JOIN classifications c ON b.id = c.bookmark_id
    WHERE c.id IS NULL
    ORDER BY b.created_at DESC
  `).all() as any[];
  
  return rows.map(row => ({
    id: row.id,
    tweet_id: row.tweet_id,
    url: row.url,
    content_type: row.content_type,
    title: row.title,
    author_name: row.author_name,
    author_handle: row.author_handle,
    tweet_text: row.tweet_text,
    fetched_at: row.fetched_at,
  }));
}
