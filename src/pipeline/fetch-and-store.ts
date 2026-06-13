import type { Client } from '@libsql/client';
import { fetchBookmarks } from '../fetch/bird';
import { createBookmarks } from '../db/bookmarks';
import { createNotification } from '../db/notifications';
import type { FetchOptions } from '../fetch/types';

interface FetchAndStoreResult {
  stored: number;
  skipped: number;
}

export async function fetchAndStore(
  db: Client,
  options: FetchOptions = {}
): Promise<FetchAndStoreResult> {
  const bookmarks = await fetchBookmarks(options);

  const { rows: beforeRows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM bookmarks' });
  const countBefore = (beforeRows?.[0] as any)?.count ?? 0;

  await createBookmarks(db, bookmarks);

  const { rows: afterRows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM bookmarks' });
  const countAfter = (afterRows?.[0] as any)?.count ?? 0;

  const stored = countAfter - countBefore;
  const skipped = bookmarks.length - stored;

  await createNotification(db, {
    type: 'status',
    title: 'Fetch Complete',
    message: `${stored} new bookmarks fetched, ${skipped} skipped`,
    data: { stored, skipped, total: bookmarks.length },
  });

  return { stored, skipped };
}
