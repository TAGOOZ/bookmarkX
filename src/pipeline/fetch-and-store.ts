import type { Client } from '@libsql/client';
import { fetchBookmarks } from '../fetch/bird';
import { storeBookmarks } from '../db/bookmarks';
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
  const countBefore = (beforeRows[0] as any).count;

  await storeBookmarks(db, bookmarks);

  const { rows: afterRows } = await db.execute({ sql: 'SELECT COUNT(*) as count FROM bookmarks' });
  const countAfter = (afterRows[0] as any).count;

  return {
    stored: countAfter - countBefore,
    skipped: bookmarks.length - (countAfter - countBefore),
  };
}
