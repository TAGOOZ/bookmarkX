import type { ParserResult, ParseOptions } from './types';

export async function parseArticle(
  url: string,
  options: ParseOptions = {},
): Promise<ParserResult> {
  if (options.tweetText) {
    const { parseTweetText } = await import('./local-parser');
    return parseTweetText(options.tweetText);
  }

  const urlsToTry = options.outerUrls?.length
    ? [...options.outerUrls, url]
    : [url];

  for (const tryUrl of urlsToTry) {
    try {
      const { parseURL } = await import('./local-parser');
      return await parseURL(tryUrl, { timeoutMs: options.timeoutMs || 15000 });
    } catch (localError) {
      console.warn(`Local parser failed for ${tryUrl}:`, localError);
      // Only try Gemini for the last URL
      if (tryUrl === urlsToTry[urlsToTry.length - 1]) {
        const { parseWithGemini } = await import('./gemini-fallback');
        return await parseWithGemini(tryUrl, {
          apiKey: options.apiKey,
          model: options.model,
          timeoutMs: options.timeoutMs,
        });
      }
    }
  }

  throw new Error(`Failed to parse any URL: ${urlsToTry.join(', ')}`);
}

export { parseHTMLToBlocks } from './local-parser';
export type { ParserResult, ParseOptions } from './types';
