import { useState, useEffect, useCallback } from 'react';
import type { BookmarkDetailData } from '../types';

interface UseChatSessionProps {
  bookmarkId: string;
  bookmarkChatSessionId?: string;
  onBookmarkChange?: (updated: Partial<BookmarkDetailData>) => void;
}

export function useChatSession({ bookmarkId, bookmarkChatSessionId, onBookmarkChange }: UseChatSessionProps) {
  const [chatSessionId, setChatSessionId] = useState<string | undefined>(bookmarkChatSessionId);

  useEffect(() => {
    setChatSessionId(bookmarkChatSessionId);
  }, [bookmarkChatSessionId]);

  const createSession = useCallback(async () => {
    const newId = `chat-${bookmarkId}-${Date.now()}`;
    setChatSessionId(newId);
    onBookmarkChange?.({ chatSessionId: newId });
    return newId;
  }, [bookmarkId, onBookmarkChange]);

  return { chatSessionId, createSession };
}