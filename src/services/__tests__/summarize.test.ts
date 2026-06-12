import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../gemini', () => ({
  callGemini: vi.fn(),
}));

vi.mock('../../db/summaries', () => ({
  storeSummary: vi.fn(),
}));

vi.mock('../../db/article-content', () => ({
  getArticleContent: vi.fn(),
}));

import { summarizeBookmark } from '../summarize';
import { callGemini } from '../gemini';
import { storeSummary } from '../../db/summaries';
import { getArticleContent } from '../../db/article-content';

const mockCallGemini = vi.mocked(callGemini);
const mockStoreSummary = vi.mocked(storeSummary);
const mockGetArticleContent = vi.mocked(getArticleContent);

function createMockDb() {
  return {} as any;
}

describe('summarizeBookmark', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dual-language summary on success', async () => {
    mockCallGemini.mockResolvedValue(JSON.stringify({
      content_en: 'English summary',
      content_ar: 'Arabic summary',
    }));

    const result = await summarizeBookmark(createMockDb(), 'bm-1', {
      title: 'Test',
      tweet_text: 'Tweet',
      url: 'https://example.com',
    }, { apiKey: 'key' });

    expect(result.content_en).toBe('English summary');
    expect(result.content_ar).toBe('Arabic summary');
  });

  it('throws when API key is missing', async () => {
    await expect(
      summarizeBookmark(createMockDb(), 'bm-1', {
        title: 'Test',
        tweet_text: null,
        url: 'https://example.com',
      }, {}),
    ).rejects.toThrow('GEMINI_API_KEY is required');
  });

  it('stores summary in DB after generation', async () => {
    mockCallGemini.mockResolvedValue(JSON.stringify({
      content_en: 'English',
      content_ar: 'Arabic',
    }));

    await summarizeBookmark(createMockDb(), 'bm-1', {
      title: 'Test',
      tweet_text: null,
      url: 'https://example.com',
    }, { apiKey: 'key' });

    expect(mockStoreSummary).toHaveBeenCalledWith(
      expect.anything(),
      'bm-1',
      expect.objectContaining({ content_en: 'English', content_ar: 'Arabic' }),
    );
  });

  it('throws on invalid JSON response', async () => {
    mockCallGemini.mockResolvedValue('not json at all');

    await expect(
      summarizeBookmark(createMockDb(), 'bm-1', {
        title: 'Test',
        tweet_text: null,
        url: 'https://example.com',
      }, { apiKey: 'key' }),
    ).rejects.toThrow('Failed to parse summarize response');
  });

  it('throws when missing required fields', async () => {
    mockCallGemini.mockResolvedValue(JSON.stringify({ content_en: 'English' }));

    await expect(
      summarizeBookmark(createMockDb(), 'bm-1', {
        title: 'Test',
        tweet_text: null,
        url: 'https://example.com',
      }, { apiKey: 'key' }),
    ).rejects.toThrow('Invalid summary result');
  });

  it('includes article content in prompt when available', async () => {
    mockGetArticleContent.mockResolvedValue({
      id: 'ac-1',
      bookmark_id: 'bm-1',
      extracted_text: 'This is the full article content about AI.',
      word_count: 100,
      blocks_json: undefined,
      parser_version: 1,
      content_hash: '',
      created_at: '2024-01-01',
    });
    mockCallGemini.mockResolvedValue(JSON.stringify({
      content_en: 'English summary',
      content_ar: 'Arabic summary',
    }));

    await summarizeBookmark(createMockDb(), 'bm-1', {
      title: 'Test',
      tweet_text: 'Tweet',
      url: 'https://example.com',
    }, { apiKey: 'key' });

    expect(mockGetArticleContent).toHaveBeenCalledWith(expect.anything(), 'bm-1');
    const prompt = mockCallGemini.mock.calls[0][0];
    expect(prompt).toContain('Full article content:');
    expect(prompt).toContain('This is the full article content about AI.');
  });

  it('falls back to metadata-only when article content is absent', async () => {
    mockGetArticleContent.mockResolvedValue(null);
    mockCallGemini.mockResolvedValue(JSON.stringify({
      content_en: 'English summary',
      content_ar: 'Arabic summary',
    }));

    await summarizeBookmark(createMockDb(), 'bm-1', {
      title: 'Test',
      tweet_text: 'Tweet',
      url: 'https://example.com',
    }, { apiKey: 'key' });

    const prompt = mockCallGemini.mock.calls[0][0];
    expect(prompt).not.toContain('Full article content:');
  });
});
