interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_RETRY: RetryOptions = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
};

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callGemini(
  prompt: string,
  options: { apiKey: string; model: string; retry?: RetryOptions },
): Promise<string> {
  const retry = { ...DEFAULT_RETRY, ...options.retry };
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent`;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= retry.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-goog-api-key': options.apiKey,
          'Content-Type': 'application/json',
        },
        body: payload,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => {
        console.warn('Failed to read Gemini error response body');
        return '';
      });
        console.error(`Gemini API response ${response.status}:`, body);
        if (isRetryableStatus(response.status) && attempt < retry.maxRetries) {
          const delay = Math.min(
            retry.initialDelayMs! * Math.pow(2, attempt),
            retry.maxDelayMs!,
          );
          await sleep(delay);
          continue;
        }
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}`,
        );
      }

      const json = await response.json();

      if (json.error) {
        throw new Error(`Gemini API error: ${json.error.message || 'unknown'}`);
      }

      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Gemini API error: invalid response — no text in candidates');
      }

      return text.replace(/```json\n?|\n?```/g, '').trim();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < retry.maxRetries && !lastError.message.startsWith('Gemini API error:')) {
        const delay = Math.min(
          retry.initialDelayMs! * Math.pow(2, attempt),
          retry.maxDelayMs!,
        );
        await sleep(delay);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError ?? new Error('Gemini API failed after retries');
}
