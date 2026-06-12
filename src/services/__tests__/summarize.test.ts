import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../gemini', () => ({
  callGemini: vi.fn(),
}));

vi.mock('../../db/summaries', () => ({
  storeSummary: vi.fn(),
}));

import { summarizeBookmark } from '../summarize';
import { callGemini } from '../gemini';
import { storeSummary } from '../../db/summaries';

const mockCallGemini = vi.mocked(callGemini);
const mockStoreSummary = vi.mocked(storeSummary);

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
});
