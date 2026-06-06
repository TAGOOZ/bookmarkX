import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseArticle } from '../index';

const localResult = {
  blocks: [{ type: 'paragraph', content: 'Local content' }],
  wordCount: 2,
  readingTime: 1,
};

const geminiResult = {
  blocks: [{ type: 'paragraph', content: 'Gemini content' }],
  wordCount: 2,
  readingTime: 1,
};

beforeEach(() => {
  vi.resetModules();
});

describe('parseArticle', () => {
  it('returns local parser result when it succeeds', async () => {
    vi.doMock('../local-parser', () => ({
      parseURL: vi.fn().mockResolvedValue(localResult),
    }));

    const result = await parseArticle('https://example.com');
    expect(result).toEqual(localResult);
  });

  it('falls back to Gemini when local parser throws', async () => {
    vi.doMock('../local-parser', () => ({
      parseURL: vi.fn().mockRejectedValue(new Error('network error')),
    }));
    vi.doMock('../gemini-fallback', () => ({
      parseWithGemini: vi.fn().mockResolvedValue(geminiResult),
    }));

    const result = await parseArticle('https://example.com', { apiKey: 'test-key' });
    expect(result).toEqual(geminiResult);
  });

  it('throws when both local and Gemini fail', async () => {
    vi.doMock('../local-parser', () => ({
      parseURL: vi.fn().mockRejectedValue(new Error('local fail')),
    }));
    vi.doMock('../gemini-fallback', () => ({
      parseWithGemini: vi.fn().mockRejectedValue(new Error('gemini fail')),
    }));

    await expect(parseArticle('https://example.com', { apiKey: 'key' })).rejects.toThrow('gemini fail');
  });
});
