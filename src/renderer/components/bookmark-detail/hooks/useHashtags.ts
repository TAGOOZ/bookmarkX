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
    const updated = [...hashtags, newHashtag];
    setHashtags(updated);
    onBookmarkChange?.({ hashtags: updated });
    try {
      const allHashtags = await window.api.getAllHashtags();
      const existing = allHashtags.find((h) => h.name === name);
      if (existing) {
        await window.api.attachHashtagToBookmark(bookmarkId, existing.id);
      }
    } catch {
      // silently fail
    }
  }, [bookmarkId, hashtags, onBookmarkChange]);

  const removeHashtag = useCallback(async (id: string) => {
    const updated = hashtags.filter((h) => h.id !== id);
    setHashtags(updated);
    onBookmarkChange?.({ hashtags: updated });
    try {
      await window.api.detachHashtagFromBookmark(bookmarkId, id);
    } catch {
      // silently fail
    }
  }, [bookmarkId, hashtags, onBookmarkChange]);

  return { hashtags, addHashtag, removeHashtag };
}