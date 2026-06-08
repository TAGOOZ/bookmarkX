import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callGemini } from '../gemini';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as unknown as Response;
}

function errorResponse(status: number, body = ''): Response {
  return {
    ok: false,
    status,
    statusText: `Error ${status}`,
    json: () => Promise.resolve({ error: { message: body } }),
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

describe('callGemini', () => {
  it('returns text on success', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ candidates: [{ content: { parts: [{ text: 'Hello world' }] } }] }),
    );

    const result = await callGemini('test prompt', { apiKey: 'key', model: 'gemini-2.0-flash' });

    expect(result).toBe('Hello world');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('generativelanguage.googleapis.com'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('strips markdown fences from response', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ candidates: [{ content: { parts: [{ text: '```json\n[1,2]\n```' }] } }] }),
    );

    const result = await callGemini('prompt', { apiKey: 'key', model: 'm' });
    expect(result).toBe('[1,2]');
  });

  it('throws on API error in response body', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: { message: 'Rate limited' } }));

    await expect(callGemini('p', { apiKey: 'k', model: 'm' })).rejects.toThrow('Gemini API error: Rate limited');
  });

  it('throws on missing candidates', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ candidates: [] }));

    await expect(callGemini('p', { apiKey: 'k', model: 'm' })).rejects.toThrow('Gemini API error: invalid response');
  });

  it('retries on 500 then succeeds', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(500, 'server error'))
      .mockResolvedValueOnce(
        jsonResponse({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
      );

    const result = await callGemini('p', {
      apiKey: 'k',
      model: 'm',
      retry: { maxRetries: 2, initialDelayMs: 100 },
    });

    expect(result).toBe('ok');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 then succeeds', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(429, 'rate limit'))
      .mockResolvedValueOnce(
        jsonResponse({ candidates: [{ content: { parts: [{ text: 'recovered' }] } }] }),
      );

    const result = await callGemini('p', {
      apiKey: 'k',
      model: 'm',
      retry: { maxRetries: 2, initialDelayMs: 100 },
    });

    expect(result).toBe('recovered');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry on 400', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(400, 'bad request'));

    await expect(
      callGemini('p', { apiKey: 'k', model: 'm', retry: { maxRetries: 3, initialDelayMs: 100 } }),
    ).rejects.toThrow('Gemini API error: 400');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('exhausts retries then throws', async () => {
    mockFetch.mockResolvedValue(errorResponse(503, 'down'));

    await expect(
      callGemini('p', { apiKey: 'k', model: 'm', retry: { maxRetries: 2, initialDelayMs: 100 } }),
    ).rejects.toThrow('Gemini API error: 503');

    expect(mockFetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('retries on network error then succeeds', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('fetch failed'))
      .mockResolvedValueOnce(
        jsonResponse({ candidates: [{ content: { parts: [{ text: 'recovered' }] } }] }),
      );

    const result = await callGemini('p', {
      apiKey: 'k',
      model: 'm',
      retry: { maxRetries: 2, initialDelayMs: 100 },
    });

    expect(result).toBe('recovered');
  });

  it('uses exponential backoff delays', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(500, 'err'))
      .mockResolvedValueOnce(errorResponse(500, 'err'))
      .mockResolvedValueOnce(
        jsonResponse({ candidates: [{ content: { parts: [{ text: 'done' }] } }] }),
      );

    const promise = callGemini('p', {
      apiKey: 'k',
      model: 'm',
      retry: { maxRetries: 3, initialDelayMs: 1000, maxDelayMs: 10000 },
    });

    // Advance past first retry delay (1000ms)
    await vi.advanceTimersByTimeAsync(1000);
    // Advance past second retry delay (2000ms)
    await vi.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result).toBe('done');
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it('respects maxDelayMs cap', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(500, 'err'))
      .mockResolvedValueOnce(errorResponse(500, 'err'))
      .mockResolvedValueOnce(errorResponse(500, 'err'))
      .mockResolvedValueOnce(
        jsonResponse({ candidates: [{ content: { parts: [{ text: 'done' }] } }] }),
      );

    const promise = callGemini('p', {
      apiKey: 'k',
      model: 'm',
      retry: { maxRetries: 4, initialDelayMs: 5000, maxDelayMs: 3000 },
    });

    // Each delay should be capped at 3000ms
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);
    await vi.advanceTimersByTimeAsync(3000);

    const result = await promise;
    expect(result).toBe('done');
  });
});
