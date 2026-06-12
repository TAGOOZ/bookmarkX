import { useState, useCallback } from 'react';
import type { BlockNoteEditor } from '@blocknote/core';
import type { BookmarkDetailData } from '../types';

interface UseArticleExtractionProps {
  bookmark: BookmarkDetailData;
  editor: BlockNoteEditor;
  onBookmarkChange?: (updated: Partial<BookmarkDetailData>) => void;
}

export function useArticleExtraction({ bookmark, onBookmarkChange }: UseArticleExtractionProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const runExtraction = useCallback(async (_force?: boolean) => {
    if (!bookmark.url) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const result = await window.api.extractArticle(bookmark.id, bookmark.url);
      if (result && result.blocks_json) {
        onBookmarkChange?.({ articleBlocks: result.blocks_json, articleWordCount: result.word_count, articleReadingTime: result.reading_time } as Partial<BookmarkDetailData>);
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Extraction failed');
    } finally {
      setIsParsing(false);
    }
  }, [bookmark.id, bookmark.url, onBookmarkChange]);

  return { isParsing, parseError, runExtraction };
}