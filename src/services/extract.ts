import type { Client } from '@libsql/client';
import { storeArticleContent } from '../db/article-content';
import type { ServiceOptions } from './types';

export interface ExtractResult {
  extracted_text: string;
  word_count: number;
  blocks_json: string;
  reading_time: number;
  og_title?: string;
  og_description?: string;
  og_image?: string;
  og_site_name?: string;
}

interface CacheEntry {
  result: ExtractResult;
  bookmarkId: string;
  timestamp: number;
}

const extractCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 100;

function evictExpired(): void {
  const now = Date.now();
  for (const [key, entry] of extractCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      extractCache.delete(key);
    }
  }
}

function evictOldest(): void {
  if (extractCache.size <= MAX_CACHE_SIZE) return;
  const excess = extractCache.size - MAX_CACHE_SIZE;
  const keys = [...extractCache.keys()];
  for (let i = 0; i < excess; i++) {
    extractCache.delete(keys[i]);
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
    try {
      await storeArticleContent(db, bookmarkId, {
        extracted_text: cached.extracted_text,
        word_count: cached.word_count,
        blocks_json: cached.blocks_json,
        og_title: cached.og_title,
        og_description: cached.og_description,
        og_image: cached.og_image,
        og_site_name: cached.og_site_name,
      });
    } catch {
      // FK constraint may fail for mock/transient bookmarks
    }
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
    og_title: result.ogTitle,
    og_description: result.ogDescription,
    og_image: result.ogImage,
    og_site_name: result.ogSiteName,
  };

  extractCache.set(url, {
    result: extractResult,
    bookmarkId,
    timestamp: Date.now(),
  });
  evictOldest();

  try {
    await storeArticleContent(db, bookmarkId, {
      extracted_text: extractedText,
      word_count: result.wordCount,
      blocks_json: blocksJson,
      og_title: result.ogTitle,
      og_description: result.ogDescription,
      og_image: result.ogImage,
      og_site_name: result.ogSiteName,
    });
  } catch {
    // FK constraint may fail for mock/transient bookmarks — extraction still valid
  }

  return extractResult;
}

export function clearExtractCache(): void {
  extractCache.clear();
}
