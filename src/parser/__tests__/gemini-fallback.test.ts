import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseWithGemini } from '../gemini-fallback';

vi.mock('../../services/gemini', () => ({
  callGemini: vi.fn(),
}));

import { callGemini } from '../../services/gemini';

const mockCallGemini = vi.mocked(callGemini);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('parseWithGemini', () => {
  it('throws when no apiKey provided', async () => {
    await expect(parseWithGemini('https://example.com')).rejects.toThrow('GEMINI_API_KEY is required');
  });

  it('parses valid blocks from Gemini response', async () => {
    const blocks = [
      { type: 'heading', props: { level: 1 }, content: 'Title' },
      { type: 'paragraph', content: 'Body text' },
    ];
    mockCallGemini.mockResolvedValue(JSON.stringify(blocks));

    const result = await parseWithGemini('https://example.com', { apiKey: 'test-key' });

    expect(result.blocks).toEqual(blocks);
    expect(result.wordCount).toBe(3);
    expect(result.readingTime).toBe(1);
    expect(mockCallGemini).toHaveBeenCalledWith(
      expect.stringContaining('https://example.com'),
      { apiKey: 'test-key', model: 'gemini-2.0-flash' },
    );
  });

  it('uses custom model', async () => {
    mockCallGemini.mockResolvedValue(JSON.stringify([{ type: 'paragraph', content: 'Hi' }]));

    await parseWithGemini('https://example.com', { apiKey: 'key', model: 'gemini-1.5-pro' });

    expect(mockCallGemini).toHaveBeenCalledWith(
      expect.any(String),
      { apiKey: 'key', model: 'gemini-1.5-pro' },
    );
  });

  it('throws on non-array response', async () => {
    mockCallGemini.mockResolvedValue(JSON.stringify({ not: 'array' }));

    await expect(parseWithGemini('https://example.com', { apiKey: 'key' })).rejects.toThrow('Failed to parse');
  });

  it('throws on empty array response', async () => {
    mockCallGemini.mockResolvedValue(JSON.stringify([]));

    await expect(parseWithGemini('https://example.com', { apiKey: 'key' })).rejects.toThrow('Failed to parse');
  });

  it('throws on invalid JSON', async () => {
    mockCallGemini.mockResolvedValue('not json at all');

    await expect(parseWithGemini('https://example.com', { apiKey: 'key' })).rejects.toThrow('Failed to parse');
  });

  it('calculates reading time correctly', async () => {
    const longText = 'word '.repeat(600);
    const blocks = [{ type: 'paragraph', content: longText.trim() }];
    mockCallGemini.mockResolvedValue(JSON.stringify(blocks));

    const result = await parseWithGemini('https://example.com', { apiKey: 'key' });

    expect(result.wordCount).toBe(600);
    expect(result.readingTime).toBe(3);
  });
});
