import type { PartialBlock } from '@blocknote/core';

export interface ParserResult {
  blocks: PartialBlock[];
  wordCount: number;
  readingTime: number;
}

export interface ParseOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}
