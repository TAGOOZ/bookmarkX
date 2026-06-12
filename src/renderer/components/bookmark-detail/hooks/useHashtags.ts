import { useState, useEffect, useCallback } from 'react';
import type { BookmarkDetailData, Hashtag } from '../types';

interface UseHashtagsProps {
  bookmarkId: string;
  onBookmarkChange?: (updated: Partial<BookmarkDetailData>) => void;
}

export function useHashtags({ bookmarkId, onBookmarkChange }: UseHashtagsProps) {
  const [hashtags, setHashtags] = useState<Hashtag[]>([]);

  useEffect(() => {
    const loadHashtags = async () => {
      try {
        const result = await window.api.getBookmarkHashtags(bookmarkId);
        if (Array.isArray(result)) {
          setHashtags(result.map((h) => ({ id: h.id, name: h.name })));
        }
      } catch {
        setHashtags([]);
      }
    };
    loadHashtags();
  }, [bookmarkId]);

  const addHashtag = useCallback(async (name: string) => {
    const newHashtag: Hashtag = { id: `tag-${Date.now()}`, name };
    setHashtags(prev => {
      const updated = [...prev, newHashtag];
      onBookmarkChange?.({ hashtags: updated });
      return updated;
    });
    try {
      const allHashtags = await window.api.getAllHashtags();
      const existing = allHashtags.find((h) => h.name === name);
      if (existing) {
        await window.api.attachHashtagToBookmark(bookmarkId, existing.id);
      }
    } catch {
      setHashtags(prev => {
        const reverted = prev.filter(h => h.id !== newHashtag.id);
        onBookmarkChange?.({ hashtags: reverted });
        return reverted;
      });
    }
  }, [bookmarkId, onBookmarkChange]);

  const removeHashtag = useCallback(async (id: string) => {
    let removedTag: Hashtag | undefined;
    setHashtags(prev => {
      removedTag = prev.find(h => h.id === id);
      const updated = prev.filter(h => h.id !== id);
      onBookmarkChange?.({ hashtags: updated });
      return updated;
    });
    try {
      await window.api.detachHashtagFromBookmark(bookmarkId, id);
    } catch {
      if (removedTag) {
        setHashtags(prev => {
          const reverted = [...prev, removedTag!];
          onBookmarkChange?.({ hashtags: reverted });
          return reverted;
        });
      }
    }
  }, [bookmarkId, onBookmarkChange]);

  return { hashtags, addHashtag, removeHashtag };
}