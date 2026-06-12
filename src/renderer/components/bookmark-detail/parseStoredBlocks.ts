import { PartialBlock } from '@blocknote/core';

export function parseStoredBlocks(blocksJson: string | undefined): PartialBlock[] | null {
  if (!blocksJson) return null;
  try {
    const parsed = JSON.parse(blocksJson);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as PartialBlock[];
    }
    return null;
  } catch {
    return null;
  }
}