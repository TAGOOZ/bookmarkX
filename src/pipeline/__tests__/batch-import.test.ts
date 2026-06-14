import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from '../../db/__tests__/test-client';

vi.mock('../../fetch/bird', () => ({
  fetchBookmarksPaginated: vi.fn(),
}));

vi.mock('../../classify/classifier', () => ({
  classifyBookmark: vi.fn(),
}));

vi.mock('../../notify/notify', () => ({
  sendHighPriorityNotification: vi.fn(),
}));

import { startBatchImport, pauseImport, getImportStatus, getActiveImport } from '../batch-import';
import { fetchBookmarksPaginated } from '../../fetch/bird';

const mockFetchBookmarks = vi.mocked(fetchBookmarksPaginated);

function createMockDb() {
  return {} as any;
}

function waitForStatus(
  getStatus: () => Promise<any>,
  expectedStatus: string,
  timeoutMs = 5000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = async () => {
      const status = await getStatus();
      if (status?.status === expectedStatus) {
        resolve(status);
        return;
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Timeout waiting for status "${expectedStatus}", last was "${status?.status}"`));
        return;
      }
      setTimeout(check, 20);
    };
    check();
  });
}

describe('batch-import pipeline', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
    vi.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  it('completes import with no bookmarks', async () => {
    mockFetchBookmarks.mockResolvedValue({
      bookmarks: [],
      nextCursor: null,
      hasMore: false,
    });

    const jobId = await startBatchImport(db, {
      authToken: 'token',
      ct0: 'ct0',
      chromeProfile: 'Default',
    });

    const status = await waitForStatus(
      () => getImportStatus(db, jobId),
      'completed',
    );
    expect(status.status).toBe('completed');
  });

  it('stores bookmarks and classifies them', async () => {
    mockFetchBookmarks
      .mockResolvedValueOnce({
        bookmarks: [
          {
            id: 'bi-1',
            tweet_id: '111',
            url: 'https://x.com/user/status/111',
            content_type: 'outer_link' as const,
            title: 'Test',
            title_ar: null,
            title_en: null,
            author_name: 'Author',
            author_handle: 'author',
            tweet_text: 'Text',
            outer_urls: null,
            thread_tweet_count: null,
            video_url: null,
            fetched_at: '2024-01-01T00:00:00Z',
          },
        ],
        nextCursor: 'cursor1',
        hasMore: true,
      })
      .mockResolvedValueOnce({
        bookmarks: [],
        nextCursor: null,
        hasMore: false,
      });

    const jobId = await startBatchImport(db, {
      authToken: 'token',
      ct0: 'ct0',
      chromeProfile: 'Default',
    });

    const status = await waitForStatus(
      () => getImportStatus(db, jobId),
      'completed',
    );
    expect(status.totalFetched).toBe(1);
  });

  it('getActiveImport returns null when no import', async () => {
    const active = await getActiveImport(db);
    expect(active).toBeNull();
  });

  it('getImportStatus returns null for nonexistent job', async () => {
    const status = await getImportStatus(db, 'nonexistent-id');
    expect(status).toBeNull();
  });
});
