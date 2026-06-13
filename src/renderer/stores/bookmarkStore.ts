import { create } from 'zustand';
import type { Bookmark } from '../types';
import type { BookmarkDetailData } from '../components/bookmark-detail/types';
import { mockBookmarks } from '../mockData';
import { useSplitStore, computeOpenBookmarks } from './splitStore';

const MOCK_MODE_KEY = 'bookmarkx-mock-mode';

interface BookmarkStore {
  bookmarks: Bookmark[];
  refreshKey: number;
  mockMode: boolean;

  setBookmarks: (bookmarks: Bookmark[]) => void;
  incrementRefreshKey: () => void;
  setMockMode: (mode: boolean | ((prev: boolean) => boolean)) => void;

  handleBookmarkSelect: (bookmark: Bookmark) => void;
  handleBookmarkChange: (bookmarkId: string, updated: Partial<BookmarkDetailData>) => void;

  getActiveBookmark: () => Bookmark | null;
  fetchBookmarks: () => Promise<void>;
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  bookmarks: [],
  refreshKey: 0,
  mockMode: (() => {
    try {
      return localStorage.getItem(MOCK_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  })(),

  setBookmarks: (bookmarks) => set({ bookmarks }),
  incrementRefreshKey: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
  setMockMode: (modeOrFn) =>
    set((state) => {
      const next = typeof modeOrFn === 'function' ? modeOrFn(state.mockMode) : modeOrFn;
      try {
        localStorage.setItem(MOCK_MODE_KEY, String(next));
      } catch {
        // localStorage may be unavailable
      }
      return { mockMode: next };
    }),

  handleBookmarkSelect: (bookmark) => {
    const { splitState, openBookmarks } = useSplitStore.getState();

    // Already open in the active column — no-op
    const activeCol = splitState.columns.find((c) => c.id === splitState.activeColumnId);
    if (activeCol?.activeTabId === bookmark.id) return;

    // If bookmark is already open in any column, switch to that column and activate it
    const existingCol = splitState.columns.find((c) => c.tabs.includes(bookmark.id));
    if (existingCol) {
      if (existingCol.id === splitState.activeColumnId && existingCol.activeTabId === bookmark.id) return; // already active
      useSplitStore.getState().setSplitState({
        ...splitState,
        activeColumnId: existingCol.id,
        columns: splitState.columns.map((c) =>
          c.id === existingCol.id
            ? { ...c, activeTabId: bookmark.id }
            : c,
        ),
      });
      return;
    }

    let newSplit: typeof splitState;

    if (!activeCol) {
      if (splitState.columns.length > 0) {
        // activeColumnId is stale — use first column
        const firstCol = splitState.columns[0];
        newSplit = {
          ...splitState,
          activeColumnId: firstCol.id,
          columns: splitState.columns.map((c) =>
            c.id === firstCol.id
              ? { ...c, tabs: [...c.tabs, bookmark.id], activeTabId: bookmark.id }
              : c,
          ),
        };
      } else {
        // No columns yet — create first column
        const newCol = {
          id: `col-${Date.now()}`,
          tabs: [bookmark.id],
          activeTabId: bookmark.id,
          width: 1,
        };
        newSplit = { columns: [newCol], activeColumnId: newCol.id };
      }
    } else {
      // Add bookmark as a new tab in the active column (Obsidian behavior)
      newSplit = {
        ...splitState,
        columns: splitState.columns.map((c) =>
          c.id === activeCol.id
            ? { ...c, tabs: [...c.tabs, bookmark.id], activeTabId: bookmark.id }
            : c,
        ),
        activeColumnId: activeCol.id,
      };
    }

    const newOpen = (() => {
      const bookmarkInOpen = openBookmarks.find((b) => b.id === bookmark.id);
      const withBookmark = bookmarkInOpen ? openBookmarks : [...openBookmarks, bookmark];
      return computeOpenBookmarks(newSplit.columns, withBookmark);
    })();

    useSplitStore.getState().setSplitState(newSplit);
    useSplitStore.getState().setOpenBookmarks(newOpen);
  },

  handleBookmarkChange: (bookmarkId, updated) => {
    set((state) => ({
      bookmarks: state.bookmarks.map((b) =>
        b.id === bookmarkId ? { ...b, ...updated } : b,
      ),
    }));
    useSplitStore.getState().setOpenBookmarks((prev) =>
      prev.map((b) => (b.id === bookmarkId ? { ...b, ...updated } : b)),
    );
  },

  getActiveBookmark: () => {
    const { openBookmarks, splitState } = useSplitStore.getState();
    const activeCol = splitState.columns.find((c) => c.id === splitState.activeColumnId);
    if (!activeCol?.activeTabId) return null;
    return openBookmarks.find((b) => b.id === activeCol.activeTabId) ?? null;
  },

  fetchBookmarks: async () => {
    const { mockMode } = get();
    if (mockMode) {
      set({ bookmarks: mockBookmarks });
      return;
    }
    try {
      const [dbBookmarks, classifications] = await Promise.all([
        window.api.getBookmarks(),
        window.api.getClassifications(),
      ]);
      const classificationMap = new Map(
        classifications.map((c) => [c.bookmark_id, c]),
      );
      const locale = document.documentElement.lang === 'ar' ? 'ar' : 'en';
      const mappedBookmarks: Bookmark[] = dbBookmarks.map((dbBookmark) => {
        const classification = classificationMap.get(dbBookmark.id);
        const titleAr = dbBookmark.title_ar || dbBookmark.title || dbBookmark.tweet_text || null;
        const titleEn = dbBookmark.title_en || dbBookmark.title || dbBookmark.tweet_text || null;
        const displayTitle =
          locale === 'ar'
            ? (titleAr || titleEn || 'Untitled')
            : (titleEn || titleAr || 'Untitled');
        return {
          id: dbBookmark.id,
          title: displayTitle,
          titleAr,
          titleEn,
          url: dbBookmark.url,
          topic: classification?.topic || 'Uncategorized',
          priority:
            (classification?.priority as 'high' | 'medium' | 'low') || 'medium',
          contentType: dbBookmark.content_type,
          content: dbBookmark.tweet_text || '',
          createdAt: dbBookmark.fetched_at,
          readingTime: classification?.reading_time_min || undefined,
        };
      });
      set({ bookmarks: mappedBookmarks });
    } catch (err) {
      console.error('Failed to fetch bookmarks:', err);
      set({ bookmarks: [] });
    }
  },
}));

export { useSplitStore } from './splitStore';
export type { SplitState, SplitColumn } from './splitStore';
