import type { PartialBlock } from '@blocknote/core';
import type { ParserResult, ParseOptions } from './types';

export async function parseArticle(
  url: string,
  options: ParseOptions = {},
): Promise<ParserResult> {
  try {
    const { parseURL } = await import('./local-parser');
    return await parseURL(url, { timeoutMs: options.timeoutMs || 15000 });
  } catch {
    // Local parser failed — try Gemini fallback
    const { parseWithGemini } = await import('./gemini-fallback');
    return await parseWithGemini(url, {
      apiKey: options.apiKey,
      model: options.model,
    });
  }
}

export { parseHTMLToBlocks } from './local-parser';
export type { ParserResult, ParseOptions } from './types';
