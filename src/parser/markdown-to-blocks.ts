import type { PartialBlock } from '@blocknote/core';
import { parseMDToBlocks } from './parse-markdown';

export function markdownToBlocks(markdown: string): PartialBlock[] {
  return parseMDToBlocks(markdown);
}
