import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../gemini', () => ({
  callGemini: vi.fn(),
}));

import { enhanceNote } from '../enhance';
import { callGemini } from '../gemini';

const mockCallGemini = vi.mocked(callGemini);

describe('enhanceNote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns enhanced text on success', async () => {
    mockCallGemini.mockResolvedValue(JSON.stringify({
      enhanced_text: 'Improved text',
    }));

    const result = await enhanceNote('Original text', undefined, { apiKey: 'key' });

    expect(result.enhanced_text).toBe('Improved text');
  });

  it('throws when API key is missing', async () => {
    await expect(enhanceNote('text', undefined, {})).rejects.toThrow('GEMINI_API_KEY is required');
  });

  it('throws on invalid JSON response', async () => {
    mockCallGemini.mockResolvedValue('not json');

    await expect(enhanceNote('text', undefined, { apiKey: 'key' })).rejects.toThrow('Failed to parse enhance response');
  });

  it('throws when enhanced_text is missing', async () => {
    mockCallGemini.mockResolvedValue(JSON.stringify({}));

    await expect(enhanceNote('text', undefined, { apiKey: 'key' })).rejects.toThrow('Invalid enhance result');
  });
});
