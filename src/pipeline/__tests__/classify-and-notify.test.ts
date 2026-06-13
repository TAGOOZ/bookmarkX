import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from '../../db/__tests__/test-client';
import { classifyAndNotify } from '../classify-and-notify';
import { createBookmarks } from '../../db/bookmarks';

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
      id: 'cn-1',
      tweet_id: '111111',
      url: 'https://x.com/user/status/111111',
      content_type: 'outer_link',
      title: 'High Priority Article',
      title_ar: null,
      title_en: null,
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
      title_ar: null,
      title_en: null,
      author_name: 'Another Author',
      author_handle: 'anotherauthor',
      tweet_text: 'Less important',
      fetched_at: '2024-01-15T11:00:00Z',
    },
  ];

  beforeEach(async () => {
    await createBookmarks(db, mockBookmarks);
  });

  it('classifies bookmarks and sends notification for high priority', async () => {
    mockClassifyBookmark
      .mockResolvedValueOnce({ priority: 'high', topic: 'AI', hashtags: ['ai'], reading_time_min: 5 })
      .mockResolvedValueOnce({ priority: 'low', topic: 'General', hashtags: [], reading_time_min: 2 });

    const result = await classifyAndNotify(db);

    expect(result.classified).toBe(2);
    expect(result.notified).toBe(1);
    expect(result.errors).toBe(0);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith(
      mockBookmarks[0],
      { priority: 'high', topic: 'AI', hashtags: ['ai'], reading_time_min: 5 }
    );
  });

  it('skips already classified bookmarks', async () => {
    mockClassifyBookmark.mockResolvedValue({ priority: 'medium', topic: 'Tech', hashtags: [], reading_time_min: 3 });

    await classifyAndNotify(db);
    vi.clearAllMocks();

    const result = await classifyAndNotify(db);

    expect(result.classified).toBe(0);
    expect(mockClassifyBookmark).not.toHaveBeenCalled();
  });

  it('handles classification errors gracefully', async () => {
    mockClassifyBookmark
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce({ priority: 'high', topic: 'AI', hashtags: [], reading_time_min: 5 });

    const result = await classifyAndNotify(db);

    expect(result.classified).toBe(1);
    expect(result.errors).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledTimes(1);
  });

  it('does not send notification for non-high priority', async () => {
    mockClassifyBookmark.mockResolvedValue({ priority: 'medium', topic: 'Tech', hashtags: [], reading_time_min: 3 });

    const result = await classifyAndNotify(db);

    expect(result.notified).toBe(0);
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it('skips concurrent calls via isRunning guard', async () => {
    let callCount = 0;
    mockClassifyBookmark.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ priority: 'low', topic: 'T', hashtags: [], reading_time_min: 1 }), 50);
        });
      }
      return Promise.resolve({ priority: 'low', topic: 'T', hashtags: [], reading_time_min: 1 });
    });

    const firstCall = classifyAndNotify(db);
    const secondCall = classifyAndNotify(db);

    const [first, second] = await Promise.all([firstCall, secondCall]);

    expect(first.classified).toBe(2);
    expect(second.classified).toBe(0);
    expect(second.notified).toBe(0);
    expect(second.errors).toBe(0);
  });

  it('returns error count when all bookmarks fail classification', async () => {
    mockClassifyBookmark.mockRejectedValue(new Error('API down'));

    const result = await classifyAndNotify(db);

    expect(result.classified).toBe(0);
    expect(result.errors).toBeGreaterThanOrEqual(1);
    expect(result.notified).toBe(0);
  });

  it('stores classification in database with correct fields', async () => {
    mockClassifyBookmark.mockResolvedValue({
      priority: 'high',
      topic: 'Machine Learning',
      hashtags: ['ml', 'neural-net'],
      reading_time_min: 8,
    });

    const result = await classifyAndNotify(db);

    expect(result.classified).toBe(2);

    const { rows } = await db.execute('SELECT * FROM classifications');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect((rows[0] as any).priority).toBe('high');
    expect((rows[0] as any).reading_time_min).toBe(8);
  });

  it('creates topic record in database', async () => {
    mockClassifyBookmark.mockResolvedValue({
      priority: 'medium',
      topic: 'Web Dev',
      hashtags: [],
      reading_time_min: 4,
    });

    const result = await classifyAndNotify(db);

    expect(result.classified).toBe(2);
    const { rows } = await db.execute({ sql: 'SELECT name FROM topics' });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows.map((r: any) => r.name)).toContain('Web Dev');
  });

  it('sends notification with bookmark and classification data', async () => {
    mockClassifyBookmark.mockResolvedValue({
      priority: 'high',
      topic: 'Security',
      hashtags: ['cybersecurity'],
      reading_time_min: 6,
    });

    await classifyAndNotify(db);

    expect(mockSendNotification).toHaveBeenCalled();
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cn-1' }),
      expect.objectContaining({ priority: 'high' })
    );
  });
});
