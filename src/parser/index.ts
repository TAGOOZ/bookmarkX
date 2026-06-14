import type { ParserResult, ParseOptions } from './types';
import type { Bookmark } from '../fetch/types';

export async function parseBookmark(
  bookmark: Bookmark,
  options: ParseOptions = {},
): Promise<ParserResult> {
  const { content_type, tweet_text, outer_urls, url } = bookmark;

  switch (content_type) {
    case 'plain_tweet':
    case 'thread': {
      if (tweet_text) {
        const { parseTweetText } = await import('./local-parser');
        return parseTweetText(tweet_text);
      }
      return parseArticle(url, options);
    }

    case 'outer_link': {
      return parseArticle(url, {
        ...options,
        outerUrls: outer_urls || undefined,
      });
    }

    case 'x_article':
    case 'video':
    default: {
      return parseArticle(url, options);
    }
  }
}

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
