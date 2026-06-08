import type { Client } from '@libsql/client';

export interface Hashtag {
  id: string;
  name: string;
  created_at: string;
}

export async function createHashtag(
  db: Client,
  name: string,
): Promise<Hashtag> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: 'INSERT INTO hashtags (id, name) VALUES (?, ?)',
    args: [id, name],
  });
  return { id, name, created_at: new Date().toISOString() };
}

export async function getOrCreateHashtag(
  db: Client,
  name: string,
): Promise<Hashtag> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM hashtags WHERE name = ?',
    args: [name],
  });
  const row = rows[0] as any;
  if (row) return { id: row.id, name: row.name, created_at: row.created_at };
  return createHashtag(db, name);
}

export async function getHashtag(db: Client, hashtagId: string): Promise<Hashtag | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM hashtags WHERE id = ?',
    args: [hashtagId],
  });
  const row = rows[0] as any;
  if (!row) return null;
  return { id: row.id, name: row.name, created_at: row.created_at };
}

export async function getAllHashtags(db: Client): Promise<Hashtag[]> {
  const { rows } = await db.execute('SELECT * FROM hashtags ORDER BY name');
  return (rows as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    created_at: row.created_at,
  }));
}

export async function deleteHashtag(
  db: Client,
  hashtagId: string,
): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM hashtags WHERE id = ?',
    args: [hashtagId],
  });
}

export async function attachHashtagToBookmark(
  db: Client,
  bookmarkId: string,
  hashtagId: string,
): Promise<void> {
  await db.execute({
    sql: 'INSERT OR IGNORE INTO bookmark_hashtags (bookmark_id, hashtag_id) VALUES (?, ?)',
    args: [bookmarkId, hashtagId],
  });
}

export async function detachHashtagFromBookmark(
  db: Client,
  bookmarkId: string,
  hashtagId: string,
): Promise<void> {
  await db.execute({
    sql: 'DELETE FROM bookmark_hashtags WHERE bookmark_id = ? AND hashtag_id = ?',
    args: [bookmarkId, hashtagId],
  });
}

export async function getBookmarkHashtags(
  db: Client,
  bookmarkId: string,
): Promise<Hashtag[]> {
  const { rows } = await db.execute({
    sql: `SELECT h.* FROM hashtags h
          JOIN bookmark_hashtags bh ON h.id = bh.hashtag_id
          WHERE bh.bookmark_id = ?
          ORDER BY h.name`,
    args: [bookmarkId],
  });
  return (rows as any[]).map((row) => ({
    id: row.id,
    name: row.name,
    created_at: row.created_at,
  }));
}

export async function getBookmarksByHashtag(
  db: Client,
  hashtagId: string,
): Promise<Array<{ id: string; title: string; url: string }>> {
  const { rows } = await db.execute({
    sql: `SELECT b.id, b.title, b.title_ar, b.title_en, b.url
          FROM bookmarks b
          JOIN bookmark_hashtags bh ON b.id = bh.bookmark_id
          WHERE bh.hashtag_id = ?
          ORDER BY b.created_at DESC`,
    args: [hashtagId],
  });
  return (rows as any[]).map((row) => ({
    id: row.id,
    title: row.title_en || row.title_ar || row.title || 'Untitled',
    url: row.url,
  }));
}

export async function setBookmarkHashtags(
  db: Client,
  bookmarkId: string,
  hashtagNames: string[],
): Promise<void> {
  // Remove existing
  await db.execute({
    sql: 'DELETE FROM bookmark_hashtags WHERE bookmark_id = ?',
    args: [bookmarkId],
  });

  // Add new
  for (const name of hashtagNames) {
    const hashtag = await getOrCreateHashtag(db, name);
    await attachHashtagToBookmark(db, bookmarkId, hashtag.id);
  }
}
