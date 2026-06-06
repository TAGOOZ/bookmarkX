import type { Client } from '@libsql/client';
import { callGemini } from './gemini';
import { storeArticleContent } from '../db/article-content';
import type { ServiceOptions, ExtractResult } from './types';

function buildExtractPrompt(url: string): string {
  return `Extract the main article content from this URL. Return JSON with:
- extracted_text: The full article text (cleaned up, no HTML)
- word_count: Number of words in the extracted text

URL: ${url}

Return ONLY valid JSON, no markdown.`;
}

export async function extractArticle(
  db: Client,
  bookmarkId: string,
  url: string,
  options: ServiceOptions = {},
): Promise<ExtractResult> {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const model = options.model || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const prompt = buildExtractPrompt(url);
  const text = await callGemini(prompt, { apiKey, model });
  const result = JSON.parse(text) as ExtractResult;

  if (!result.extracted_text || typeof result.word_count !== 'number') {
    throw new Error('Invalid extraction result');
  }

  await storeArticleContent(db, bookmarkId, {
    extracted_text: result.extracted_text,
    word_count: result.word_count,
  });

  return result;
}
