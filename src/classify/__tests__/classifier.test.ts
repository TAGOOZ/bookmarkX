import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyBookmark } from '../classifier';
import type { ClassificationResult } from '../types';
import type { Bookmark } from '../../fetch/types';

vi.mock('child_process', () => ({
  execFile: vi.fn(),
}));

import { execFile } from 'child_process';

const mockExecFile = vi.mocked(execFile);

function mockGeminiResponse(response: ClassificationResult) {
  mockExecFile.mockImplementation(
    (_cmd: any, _args: any, _opts: any, cb: any) => {
      if (typeof _opts === 'function') {
        cb = _opts;
      }
      cb(null, JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(response) }] } }] }), '');
    }
  );
}

function mockGeminiError(message: string) {
  mockExecFile.mockImplementation(
    (_cmd: any, _args: any, _opts: any, cb: any) => {
      if (typeof _opts === 'function') {
        cb = _opts;
      }
      cb(new Error(message), '', '');
    }
  );
}

describe('classifyBookmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBookmark: Bookmark = {
    id: 'classify-1',
    tweet_id: '123456',
    url: 'https://x.com/user/status/123456',
    content_type: 'outer_link',
    title: 'Understanding AI',
    title_ar: null,
    title_en: null,
    author_name: 'AI Expert',
    author_handle: 'aiexpert',
    tweet_text: 'Check out this article about machine learning and neural networks',
    fetched_at: '2024-01-15T10:00:00Z',
  };

  it('returns classification with priority, topic, hashtags, and reading time', async () => {
    const mockResult: ClassificationResult = {
      priority: 'high',
      topic: 'AI',
      hashtags: ['machine-learning', 'tutorial'],
      reading_time_min: 5,
    };
    mockGeminiResponse(mockResult);

    const result = await classifyBookmark(mockBookmark, { apiKey: 'test-key' });

    expect(result).toEqual(mockResult);
  });

  it('calls Gemini API with correct prompt', async () => {
    mockGeminiResponse({
      priority: 'medium',
      topic: 'Tech',
      hashtags: ['javascript'],
      reading_time_min: 3,
    });

    await classifyBookmark(mockBookmark, { apiKey: 'test-key' });

    expect(mockExecFile).toHaveBeenCalledWith(
      'curl',
      expect.arrayContaining([
        '-s',
        '-X',
        'POST',
        '-H',
        'Content-Type: application/json',
      ]),
      expect.any(Function)
    );
  });

  it('handles bookmarks with no title', async () => {
    const bookmarkNoTitle: Bookmark = {
      ...mockBookmark,
      title: null,
    };

    mockGeminiResponse({
      priority: 'low',
      topic: 'General',
      hashtags: ['misc'],
      reading_time_min: 2,
    });

    const result = await classifyBookmark(bookmarkNoTitle, { apiKey: 'test-key' });

    expect(result.priority).toBe('low');
    expect(result.topic).toBe('General');
  });

  it('throws on API errors', async () => {
    mockGeminiError('API request failed');

    await expect(classifyBookmark(mockBookmark, { apiKey: 'test-key' })).rejects.toThrow('API request failed');
  });

  it('throws on invalid API response', async () => {
    mockExecFile.mockImplementation((_cmd: any, _args: any, _opts: any, cb: any) => {
      if (typeof _opts === 'function') {
        cb = _opts;
      }
      cb(null, JSON.stringify({ error: 'Invalid response' }), '');
    });

    await expect(classifyBookmark(mockBookmark, { apiKey: 'test-key' })).rejects.toThrow();
  });
});
