import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from './test-client';
import {
  setBookmarkHashtags,
  getBookmarkHashtags,
} from '../hashtags';

describe('setBookmarkHashtags', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
    await db.execute({
      sql: "INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)",
      args: ['bm-1', 'https://example.com', 'outer_link'],
    });
  });

  afterEach(() => db.close());

  it('attaches 3 hashtags to a bookmark', async () => {
    await setBookmarkHashtags(db, 'bm-1', ['react', 'typescript', 'frontend']);

    const hashtags = await getBookmarkHashtags(db, 'bm-1');
    expect(hashtags).toHaveLength(3);
    expect(hashtags.map((h) => h.name).sort()).toEqual([
      'frontend', 'react', 'typescript',
    ]);
  });

  it('replaces hashtags with a new set', async () => {
    await setBookmarkHashtags(db, 'bm-1', ['react', 'typescript']);
    await setBookmarkHashtags(db, 'bm-1', ['python', 'data-science']);

    const hashtags = await getBookmarkHashtags(db, 'bm-1');
    expect(hashtags).toHaveLength(2);
    expect(hashtags.map((h) => h.name).sort()).toEqual([
      'data-science', 'python',
    ]);
  });

  it('clears all hashtags when empty array is provided', async () => {
    await setBookmarkHashtags(db, 'bm-1', ['react', 'typescript']);
    await setBookmarkHashtags(db, 'bm-1', []);

    const hashtags = await getBookmarkHashtags(db, 'bm-1');
    expect(hashtags).toHaveLength(0);
  });
});
