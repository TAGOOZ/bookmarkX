import Database from 'better-sqlite3';
import { fetchBookmarks } from '../fetch/bird';
import { storeBookmarks } from '../db/bookmarks';
import type { FetchOptions } from '../fetch/types';

interface FetchAndStoreResult {
  stored: number;
  skipped: number;
}

export async function fetchAndStore(
  db: Database.Database,
  options: FetchOptions = {}
): Promise<FetchAndStoreResult> {
  const bookmarks = await fetchBookmarks(options);
  
  const countBefore = db.prepare('SELECT COUNT(*) as count FROM bookmarks').get() as any;
  
  storeBookmarks(db, bookmarks);
  
  const countAfter = db.prepare('SELECT COUNT(*) as count FROM bookmarks').get() as any;
  
  return {
    stored: countAfter.count - countBefore.count,
    skipped: bookmarks.length - (countAfter.count - countBefore.count),
  };
}
