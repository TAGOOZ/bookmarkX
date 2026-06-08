import type { Client } from '@libsql/client';
import { storeArticleContent } from '../db/article-content';
import type { ServiceOptions } from './types';

export interface ExtractResult {
  extracted_text: string;
  word_count: number;
  blocks_json: string;
  reading_time: number;
}

interface CacheEntry {
  result: ExtractResult;
  bookmarkId: string;
  timestamp: number;
}

const extractCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of extractCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      extractCache.delete(key);
    }
  }
}

export function getCachedExtract(url: string): ExtractResult | undefined {
  evictExpired();
  const entry = extractCache.get(url);
  return entry?.result;
}

export async function extractArticle(
  db: Client,
  bookmarkId: string,
  url: string,
  options: ServiceOptions = {},
): Promise<ExtractResult> {
  const cached = getCachedExtract(url);
  if (cached) {
    await storeArticleContent(db, bookmarkId, {
      extracted_text: cached.extracted_text,
      word_count: cached.word_count,
      blocks_json: cached.blocks_json,
    });
    return cached;
  }

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

  const extractResult: ExtractResult = {
    extracted_text: extractedText,
    word_count: result.wordCount,
    blocks_json: blocksJson,
    reading_time: result.readingTime,
  };

  extractCache.set(url, {
    result: extractResult,
    bookmarkId,
    timestamp: Date.now(),
  });

  await storeArticleContent(db, bookmarkId, {
    extracted_text: extractedText,
    word_count: result.wordCount,
    blocks_json: blocksJson,
  });

  return extractResult;
}

export function clearExtractCache(): void {
  extractCache.clear();
}
