import { describe, it, expect, vi, beforeEach } from 'vitest';
import { classifyBookmark } from '../classifier';
import type { ClassificationResult } from '../types';
import type { Bookmark } from '../../fetch/types';

vi.mock('../../services/gemini', () => ({
  callGemini: vi.fn(),
}));

import { callGemini } from '../../services/gemini';

const mockCallGemini = vi.mocked(callGemini);

function mockGeminiResponse(response: ClassificationResult) {
  mockCallGemini.mockResolvedValue(JSON.stringify(response));
}

function mockGeminiRawResponse(raw: string) {
  mockCallGemini.mockResolvedValue(raw);
}

function mockGeminiError(message: string) {
  mockCallGemini.mockRejectedValue(new Error(message));
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
    outer_urls: null,
    thread_tweet_count: null,
    video_url: null,
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

  it('calls callGemini with prompt and options', async () => {
    mockGeminiResponse({
      priority: 'medium',
      topic: 'Tech',
      hashtags: ['javascript'],
      reading_time_min: 3,
    });

    await classifyBookmark(mockBookmark, { apiKey: 'test-key' });

    expect(mockCallGemini).toHaveBeenCalledWith(
      expect.stringContaining('Classify this bookmark'),
      { apiKey: 'test-key', model: 'gemini-2.0-flash' }
    );
  });

  it('throws when apiKey is missing', async () => {
    await expect(classifyBookmark(mockBookmark, {})).rejects.toThrow('GEMINI_API_KEY is required');
  });

  it('throws when apiKey is empty string', async () => {
    await expect(classifyBookmark(mockBookmark, { apiKey: '' })).rejects.toThrow('GEMINI_API_KEY is required');
  });

  it('uses default model when not specified', async () => {
    mockGeminiResponse({ priority: 'low', topic: 'General', hashtags: [], reading_time_min: 1 });

    await classifyBookmark(mockBookmark, { apiKey: 'key' });

    expect(mockCallGemini).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ model: 'gemini-2.0-flash' })
    );
  });

  it('uses custom model when specified', async () => {
    mockGeminiResponse({ priority: 'low', topic: 'General', hashtags: [], reading_time_min: 1 });

    await classifyBookmark(mockBookmark, { apiKey: 'key', model: 'gemini-pro' });

    expect(mockCallGemini).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ model: 'gemini-pro' })
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

  it('handles bookmarks with no author', async () => {
    const bookmarkNoAuthor: Bookmark = {
      ...mockBookmark,
      author_name: null,
      author_handle: null,
    };

    mockGeminiResponse({ priority: 'medium', topic: 'Tech', hashtags: [], reading_time_min: 3 });
    const result = await classifyBookmark(bookmarkNoAuthor, { apiKey: 'key' });
    expect(result.priority).toBe('medium');
  });

  it('handles bookmarks with no tweet_text', async () => {
    const bookmarkNoText: Bookmark = {
      ...mockBookmark,
      tweet_text: null,
    };

    mockGeminiResponse({ priority: 'low', topic: 'Misc', hashtags: [], reading_time_min: 1 });
    const result = await classifyBookmark(bookmarkNoText, { apiKey: 'key' });
    expect(result.priority).toBe('low');
  });

  it('handles thread content type', async () => {
    const threadBookmark: Bookmark = {
      ...mockBookmark,
      content_type: 'thread',
    };

    mockGeminiResponse({ priority: 'high', topic: 'Architecture', hashtags: ['design'], reading_time_min: 10 });
    const result = await classifyBookmark(threadBookmark, { apiKey: 'key' });
    expect(result.topic).toBe('Architecture');
  });

  it('handles x_article content type', async () => {
    const articleBookmark: Bookmark = {
      ...mockBookmark,
      content_type: 'x_article',
    };

    mockGeminiResponse({ priority: 'medium', topic: 'Writing', hashtags: [], reading_time_min: 7 });
    const result = await classifyBookmark(articleBookmark, { apiKey: 'key' });
    expect(result.reading_time_min).toBe(7);
  });

  it('throws on callGemini errors', async () => {
    mockGeminiError('API request failed');

    await expect(classifyBookmark(mockBookmark, { apiKey: 'test-key' })).rejects.toThrow('API request failed');
  });

  it('throws on non-JSON response from API', async () => {
    mockGeminiRawResponse('not json at all');

    await expect(classifyBookmark(mockBookmark, { apiKey: 'key' })).rejects.toThrow('Failed to parse classification result as JSON');
  });

  it('throws on API error in response body', async () => {
    mockGeminiError('Rate limited');

    await expect(classifyBookmark(mockBookmark, { apiKey: 'key' })).rejects.toThrow('Rate limited');
  });

  it('throws on missing candidates in response', async () => {
    mockGeminiError('Gemini API error: invalid response — no text in candidates');

    await expect(classifyBookmark(mockBookmark, { apiKey: 'key' })).rejects.toThrow('Gemini API error');
  });

  it('throws on empty text in candidates', async () => {
    mockGeminiError('Gemini API error: invalid response — no text in candidates');

    await expect(classifyBookmark(mockBookmark, { apiKey: 'key' })).rejects.toThrow('Gemini API error');
  });

  it('throws on invalid classification JSON from API', async () => {
    mockGeminiRawResponse('not valid json');

    await expect(classifyBookmark(mockBookmark, { apiKey: 'key' })).rejects.toThrow('Failed to parse classification result as JSON');
  });

  it('throws when classification result missing priority', async () => {
    mockGeminiRawResponse(JSON.stringify({ topic: 'AI', reading_time_min: 5 }));

    await expect(classifyBookmark(mockBookmark, { apiKey: 'key' })).rejects.toThrow('Invalid classification result');
  });

  it('throws when classification result missing topic', async () => {
    mockGeminiRawResponse(JSON.stringify({ priority: 'high', reading_time_min: 5 }));

    await expect(classifyBookmark(mockBookmark, { apiKey: 'key' })).rejects.toThrow('Invalid classification result');
  });

  it('throws when classification result missing reading_time_min', async () => {
    mockGeminiRawResponse(JSON.stringify({ priority: 'high', topic: 'AI' }));

    await expect(classifyBookmark(mockBookmark, { apiKey: 'key' })).rejects.toThrow('Invalid classification result');
  });

  it('defaults hashtags to empty array when not an array', async () => {
    mockGeminiRawResponse(JSON.stringify({ priority: 'medium', topic: 'Tech', reading_time_min: 3, hashtags: 'not-an-array' }));

    const result = await classifyBookmark(mockBookmark, { apiKey: 'key' });
    expect(result.hashtags).toEqual([]);
  });

  it('defaults hashtags to empty array when missing', async () => {
    mockGeminiRawResponse(JSON.stringify({ priority: 'medium', topic: 'Tech', reading_time_min: 3 }));

    const result = await classifyBookmark(mockBookmark, { apiKey: 'key' });
    expect(result.hashtags).toEqual([]);
  });

  it('strips markdown fences from response text', async () => {
    mockCallGemini.mockResolvedValue('{"priority":"high","topic":"AI","hashtags":["ai"],"reading_time_min":5}');

    const result = await classifyBookmark(mockBookmark, { apiKey: 'key' });
    expect(result.priority).toBe('high');
    expect(result.topic).toBe('AI');
  });

  it('sends bookmark content type in prompt', async () => {
    mockGeminiResponse({ priority: 'low', topic: 'General', hashtags: [], reading_time_min: 1 });

    await classifyBookmark(mockBookmark, { apiKey: 'key' });

    const prompt = mockCallGemini.mock.calls[0][0];
    expect(prompt).toContain('outer_link');
  });
});
