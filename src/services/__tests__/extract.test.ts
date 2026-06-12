import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../gemini', () => ({
  callGemini: vi.fn(),
}));

vi.mock('../../db/article-content', () => ({
  storeArticleContent: vi.fn(),
}));

vi.mock('../../parser', () => ({
  parseArticle: vi.fn(),
}));

import { extractArticle } from '../extract';
import { callGemini } from '../gemini';
import { storeArticleContent } from '../../db/article-content';
import { parseArticle } from '../../parser';

const mockCallGemini = vi.mocked(callGemini);
const mockStoreArticleContent = vi.mocked(storeArticleContent);
const mockParseArticle = vi.mocked(parseArticle);

function createMockDb() {
  return {} as any;
}

describe('extractArticle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts article content successfully', async () => {
    mockParseArticle.mockResolvedValue({
      blocks: [
        { type: 'paragraph', content: 'Hello world' },
        { type: 'paragraph', content: 'Second paragraph' },
      ],
      wordCount: 100,
      readingTime: 3,
      ogTitle: 'OG Title',
      ogDescription: 'OG Desc',
      ogImage: 'https://img.png',
      ogSiteName: 'Site',
    });

    const result = await extractArticle(createMockDb(), 'bm-1', 'https://example.com', { apiKey: 'key' });

    expect(result.word_count).toBe(100);
    expect(result.reading_time).toBe(3);
    expect(result.og_title).toBe('OG Title');
    expect(mockStoreArticleContent).toHaveBeenCalled();
  });

  it('returns cached result for same URL', async () => {
    mockParseArticle.mockResolvedValue({
      blocks: [{ type: 'paragraph', content: 'Text' }],
      wordCount: 50,
      readingTime: 1,
      ogTitle: null,
      ogDescription: null,
      ogImage: null,
      ogSiteName: null,
    });

    const first = await extractArticle(createMockDb(), 'bm-1', 'https://cached.com', { apiKey: 'key' });
    const second = await extractArticle(createMockDb(), 'bm-2', 'https://cached.com', { apiKey: 'key' });

    expect(mockParseArticle).toHaveBeenCalledTimes(1);
    expect(second.extracted_text).toBe(first.extracted_text);
  });

  it('handles parser errors', async () => {
    mockParseArticle.mockRejectedValue(new Error('Network error'));

    await expect(
      extractArticle(createMockDb(), 'bm-1', 'https://fail.com', { apiKey: 'key' }),
    ).rejects.toThrow('Network error');
  });
});
