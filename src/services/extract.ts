import type { Client } from '@libsql/client';
import { storeArticleContent } from '../db/article-content';
import type { ServiceOptions } from './types';

export interface ExtractResult {
  extracted_text: string;
  word_count: number;
  blocks_json: string;
  reading_time: number;
}

export async function extractArticle(
  db: Client,
  bookmarkId: string,
  url: string,
  options: ServiceOptions = {},
): Promise<ExtractResult> {
  const { parseArticle } = await import('../parser');

  const result = await parseArticle(url, {
    apiKey: options.apiKey,
    model: options.model,
  });

  const blocksJson = JSON.stringify(result.blocks);
  const extractedText = result.blocks
    .filter((b: any) => typeof b.content === 'string')
    .map((b: any) => b.content)
    .join('\n\n');

  await storeArticleContent(db, bookmarkId, {
    extracted_text: extractedText,
    word_count: result.wordCount,
    blocks_json: blocksJson,
  });

  return {
    extracted_text: extractedText,
    word_count: result.wordCount,
    blocks_json: blocksJson,
    reading_time: result.readingTime,
  };
}
