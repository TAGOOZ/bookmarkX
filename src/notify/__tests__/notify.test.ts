import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendNotification, sendHighPriorityNotification } from '../notify';
import type { Bookmark } from '../../fetch/types';
import type { ClassificationResult } from '../../classify/types';

vi.mock('electron', () => ({
  Notification: vi.fn().mockImplementation((options) => ({
    show: vi.fn(),
    options,
  })),
}));

import { Notification } from 'electron';

describe('Notification module', () => {
  const mockBookmark: Bookmark = {
    id: 'notify-1',
    tweet_id: '111111',
    url: 'https://x.com/user/status/111111',
    content_type: 'outer_link',
    title: 'Important Article',
    author_name: 'Test Author',
    author_handle: 'testauthor',
    tweet_text: 'Check this out',
    fetched_at: '2024-01-15T10:00:00Z',
  };

  const mockClassification: ClassificationResult = {
    priority: 'high',
    topics: ['AI', 'Tech'],
    reading_time_min: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendNotification', () => {
    it('creates and shows a notification with given options', () => {
      sendNotification({ title: 'Test Title', body: 'Test body' });

      expect(Notification).toHaveBeenCalledWith({
        title: 'Test Title',
        body: 'Test body',
      });
      const instance = vi.mocked(Notification).mock.results[0].value;
      expect(instance.show).toHaveBeenCalled();
    });
  });

  describe('sendHighPriorityNotification', () => {
    it('sends notification for high-priority bookmark', () => {
      sendHighPriorityNotification(mockBookmark, mockClassification);

      expect(Notification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'High Priority Bookmark',
          body: expect.stringContaining('Important Article'),
        })
      );
    });

    it('includes author name in notification', () => {
      sendHighPriorityNotification(mockBookmark, mockClassification);

      const call = vi.mocked(Notification).mock.calls[0][0];
      expect(call.body).toContain('Test Author');
    });

    it('includes topics in notification', () => {
      sendHighPriorityNotification(mockBookmark, mockClassification);

      const call = vi.mocked(Notification).mock.calls[0][0];
      expect(call.body).toContain('AI, Tech');
    });
  });
});
