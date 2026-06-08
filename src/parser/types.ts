import type { PartialBlock } from '@blocknote/core';

export interface ParserResult {
  blocks: PartialBlock[];
  wordCount: number;
  readingTime: number;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
}

export interface ParseOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}
