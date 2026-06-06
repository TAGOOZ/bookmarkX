/**
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../gemini', () => ({
  callGemini: vi.fn(),
}));

import { generateGlossary } from '../glossary';
import { callGemini } from '../gemini';

const mockCallGemini = vi.mocked(callGemini);

describe('generateGlossary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when GEMINI_API_KEY is missing', async () => {
    await expect(
      generateGlossary('Some article content', {}),
    ).rejects.toThrow('GEMINI_API_KEY is required');
  });

  it('calls Gemini with glossary extraction prompt', async () => {
    mockCallGemini.mockResolvedValue(
      JSON.stringify({
        terms: [
          { term: 'API', definition: 'Application Programming Interface' },
          { term: 'REST', definition: 'Representational State Transfer' },
        ],
      }),
    );

    const result = await generateGlossary('Article about APIs and REST', {
      apiKey: 'test-key',
    });

    expect(mockCallGemini).toHaveBeenCalledTimes(1);
    const prompt = mockCallGemini.mock.calls[0][0] as string;
    expect(prompt).toContain('API');
    expect(prompt).toContain('terms');
    expect(result).toEqual([
      { term: 'API', definition: 'Application Programming Interface' },
      { term: 'REST', definition: 'Representational State Transfer' },
    ]);
  });

  it('returns empty array when no terms found', async () => {
    mockCallGemini.mockResolvedValue(
      JSON.stringify({ terms: [] }),
    );

    const result = await generateGlossary('Simple content', {
      apiKey: 'test-key',
    });

    expect(result).toEqual([]);
  });

  it('uses custom model when provided', async () => {
    mockCallGemini.mockResolvedValue(
      JSON.stringify({ terms: [{ term: 'DB', definition: 'Database' }] }),
    );

    await generateGlossary('Content', {
      apiKey: 'test-key',
      model: 'gemini-2.0-pro',
    });

    expect(mockCallGemini).toHaveBeenCalledWith(
      expect.any(String),
      { apiKey: 'test-key', model: 'gemini-2.0-pro' },
    );
  });

  it('defaults to gemini-2.0-flash model', async () => {
    mockCallGemini.mockResolvedValue(
      JSON.stringify({ terms: [] }),
    );

    await generateGlossary('Content', { apiKey: 'test-key' });

    expect(mockCallGemini).toHaveBeenCalledWith(
      expect.any(String),
      { apiKey: 'test-key', model: 'gemini-2.0-flash' },
    );
  });

  it('throws on invalid JSON response', async () => {
    mockCallGemini.mockResolvedValue('not valid json');

    await expect(
      generateGlossary('Content', { apiKey: 'test-key' }),
    ).rejects.toThrow();
  });

  it('throws when terms field is missing from response', async () => {
    mockCallGemini.mockResolvedValue(
      JSON.stringify({ something_else: true }),
    );

    await expect(
      generateGlossary('Content', { apiKey: 'test-key' }),
    ).rejects.toThrow('Invalid glossary result');
  });

  it('includes article content in prompt', async () => {
    mockCallGemini.mockResolvedValue(
      JSON.stringify({ terms: [] }),
    );

    const article = 'Machine learning uses neural networks for predictions';
    await generateGlossary(article, { apiKey: 'test-key' });

    const prompt = mockCallGemini.mock.calls[0][0] as string;
    expect(prompt).toContain(article);
  });

  it('includes title in prompt when provided', async () => {
    mockCallGemini.mockResolvedValue(
      JSON.stringify({ terms: [] }),
    );

    await generateGlossary('Content', {
      apiKey: 'test-key',
      title: 'Introduction to ML',
    });

    const prompt = mockCallGemini.mock.calls[0][0] as string;
    expect(prompt).toContain('Introduction to ML');
  });
});
