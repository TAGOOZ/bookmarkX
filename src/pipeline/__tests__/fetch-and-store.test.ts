import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from '../../db/__tests__/test-client';
import { fetchAndStore } from '../fetch-and-store';
import { getStoredBookmarks } from '../../db/bookmarks';

vi.mock('../../fetch/bird', () => ({
  fetchBookmarks: vi.fn(),
}));

import { fetchBookmarks } from '../../fetch/bird';
import type { Bookmark } from '../../fetch/types';

const mockFetchBookmarks = vi.mocked(fetchBookmarks);

describe('fetchAndStore pipeline', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
    vi.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  const mockBookmarks: Bookmark[] = [
    {
      id: 'pipe-1',
      tweet_id: '111111',
      url: 'https://x.com/user/status/111111',
      content_type: 'outer_link',
      title: 'Pipeline Test',
      title_ar: null,
      title_en: null,
      author_name: 'Pipe User',
      author_handle: 'pipeuser',
      tweet_text: 'Testing pipeline',
      outer_urls: null,
      thread_tweet_count: null,
      video_url: null,
      fetched_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'pipe-2',
      tweet_id: '222222',
      url: 'https://x.com/user/status/222222',
      content_type: 'thread',
      title: null,
      title_ar: null,
      title_en: null,
      author_name: 'Thread User',
      author_handle: 'threaduser',
      tweet_text: 'Thread content',
      outer_urls: null,
      thread_tweet_count: null,
      video_url: null,
      fetched_at: '2024-01-15T11:00:00Z',
    },
  ];

  it('fetches bookmarks and stores them in the database', async () => {
    mockFetchBookmarks.mockResolvedValue(mockBookmarks);

    const result = await fetchAndStore(db, { count: 10 });

    expect(result.stored).toBe(2);
    expect(result.skipped).toBe(0);
    expect(mockFetchBookmarks).toHaveBeenCalledWith({ count: 10 });

    const stored = await getStoredBookmarks(db);
    expect(stored).toHaveLength(2);
  });

  it('skips duplicates when storing', async () => {
    mockFetchBookmarks.mockResolvedValue(mockBookmarks);

    await fetchAndStore(db, { count: 10 });
    const result = await fetchAndStore(db, { count: 10 });

    expect(result.stored).toBe(0);
    expect(result.skipped).toBe(2);

    const stored = await getStoredBookmarks(db);
    expect(stored).toHaveLength(2);
  });

  it('returns stored and skipped counts', async () => {
    mockFetchBookmarks.mockResolvedValue(mockBookmarks);

    const result = await fetchAndStore(db, { count: 5 });

    expect(result).toMatchObject({
      stored: 2,
      skipped: 0,
    });
  });

  it('handles empty fetch results', async () => {
    mockFetchBookmarks.mockResolvedValue([]);

    const result = await fetchAndStore(db, { count: 5 });

    expect(result.stored).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('propagates fetch errors', async () => {
    mockFetchBookmarks.mockRejectedValue(new Error('Auth failed'));

    await expect(fetchAndStore(db, { count: 5 })).rejects.toThrow('Auth failed');
  });
});
