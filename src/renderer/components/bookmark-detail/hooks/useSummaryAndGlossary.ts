import { useState, useCallback } from 'react';
import { IntlShape } from 'react-intl';
import type { BookmarkDetailData } from '../types';

interface UseSummaryAndGlossaryProps {
  bookmark: BookmarkDetailData;
  onBookmarkChange?: (updated: Partial<BookmarkDetailData>) => void;
  intl: IntlShape;
  setNotification: (notification: string | null) => void;
}

export function useSummaryAndGlossary({ bookmark, onBookmarkChange, intl, setNotification }: UseSummaryAndGlossaryProps) {
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingGlossary, setIsGeneratingGlossary] = useState(false);

  const handleSummarize = useCallback(async () => {
    if (!bookmark.content && !bookmark.title) return;
    setIsSummarizing(true);
    setNotification(intl.formatMessage({ id: 'generatingSummary', defaultMessage: 'Generating summary...' }));
    try {
      const result = await window.api.summarizeBookmark(bookmark.id);
      if (result && typeof result === 'object') {
        const r = result as { summary?: string; summaryAr?: string };
        onBookmarkChange?.({
          summary: r.summary || bookmark.summary,
          summaryAr: r.summaryAr || bookmark.summaryAr,
        });
        setNotification(intl.formatMessage({ id: 'summaryGenerated', defaultMessage: 'Summary generated' }));
      }
    } catch {
      setNotification(intl.formatMessage({ id: 'summaryFailed', defaultMessage: 'Failed to generate summary' }));
    } finally {
      setIsSummarizing(false);
    }
  }, [bookmark, onBookmarkChange, intl, setNotification]);

  const handleGenerateGlossary = useCallback(async () => {
    if (!bookmark.content && !bookmark.title) return;
    setIsGeneratingGlossary(true);
    setNotification(intl.formatMessage({ id: 'generatingGlossary', defaultMessage: 'Generating glossary...' }));
    try {
      const content = bookmark.content || '';
      const result = await window.api.generateGlossary(bookmark.id, content, bookmark.title);
      if (Array.isArray(result)) {
        onBookmarkChange?.({ glossaryTerms: result });
        setNotification(intl.formatMessage({ id: 'glossaryGenerated', defaultMessage: 'Glossary generated' }));
      }
    } catch {
      setNotification(intl.formatMessage({ id: 'glossaryFailed', defaultMessage: 'Failed to generate glossary' }));
    } finally {
      setIsGeneratingGlossary(false);
    }
  }, [bookmark, onBookmarkChange, intl, setNotification]);

  return { isSummarizing, isGeneratingGlossary, handleSummarize, handleGenerateGlossary };
}