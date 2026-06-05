import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { initializeSchema } from '../../db/schema';
import { classifyAndNotify } from '../classify-and-notify';
import { storeBookmarks } from '../../db/bookmarks';

import type { Bookmark } from '../../fetch/types';

vi.mock('../../classify/classifier', () => ({
  classifyBookmark: vi.fn(),
}));

vi.mock('../../notify/notify', () => ({
  sendHighPriorityNotification: vi.fn(),
}));

import { classifyBookmark } from '../../classify/classifier';
import { sendHighPriorityNotification } from '../../notify/notify';

const mockClassifyBookmark = vi.mocked(classifyBookmark);
const mockSendNotification = vi.mocked(sendHighPriorityNotification);

describe('classifyAndNotify pipeline', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    initializeSchema(db);
    vi.clearAllMocks();
  });

  afterEach(() => {
    db.close();
  });

  const mockBookmarks: Bookmark[] = [
    {
      id: 'cn-1',
      tweet_id: '111111',
      url: 'https://x.com/user/status/111111',
      content_type: 'outer_link',
      title: 'High Priority Article',
      author_name: 'Test Author',
      author_handle: 'testauthor',
      tweet_text: 'Important content',
      fetched_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'cn-2',
      tweet_id: '222222',
      url: 'https://x.com/user/status/222222',
      content_type: 'thread',
      title: 'Low Priority Thread',
      author_name: 'Another Author',
      author_handle: 'anotherauthor',
      tweet_text: 'Less important',
      fetched_at: '2024-01-15T11:00:00Z',
    },
  ];

  beforeEach(() => {
    storeBookmarks(db, mockBookmarks);
  });

  it('classifies bookmarks and sends notification for high priority', async () => {
    mockClassifyBookmark
      .mockResolvedValueOnce({ priority: 'high', topics: ['AI'], reading_time_min: 5 })
      .mockResolvedValueOnce({ priority: 'low', topics: ['General'], reading_time_min: 2 });

    const result = await classifyAndNotify(db);

    expect(result.classified).toBe(2);
    expect(result.notified).toBe(1);
    expect(result.errors).toBe(0);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith(
      mockBookmarks[0],
      { priority: 'high', topics: ['AI'], reading_time_min: 5 }
    );
  });

  it('skips already classified bookmarks', async () => {
    mockClassifyBookmark.mockResolvedValue({ priority: 'medium', topics: ['Tech'], reading_time_min: 3 });

    await classifyAndNotify(db);
    vi.clearAllMocks();

    const result = await classifyAndNotify(db);

    expect(result.classified).toBe(0);
    expect(mockClassifyBookmark).not.toHaveBeenCalled();
  });

  it('handles classification errors gracefully', async () => {
    mockClassifyBookmark
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce({ priority: 'high', topics: ['AI'], reading_time_min: 5 });

    const result = await classifyAndNotify(db);

    expect(result.classified).toBe(1);
    expect(result.errors).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it('does not send notification for non-high priority', async () => {
    mockClassifyBookmark.mockResolvedValue({ priority: 'medium', topics: ['Tech'], reading_time_min: 3 });

    const result = await classifyAndNotify(db);

    expect(result.notified).toBe(0);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});
