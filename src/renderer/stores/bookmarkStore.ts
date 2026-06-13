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
    const MAX_COLUMNS = 3;

    let newSplit: typeof splitState;
    const activeCol = splitState.columns.find((c) => c.id === splitState.activeColumnId);
    if (!activeCol) {
      newSplit = splitState;
    } else if (activeCol.bookmarkId === bookmark.id) {
      newSplit = splitState;
    } else if (!activeCol.bookmarkId) {
      newSplit = {
        ...splitState,
        columns: splitState.columns.map((c) =>
          c.id === activeCol.id ? { ...c, bookmarkId: bookmark.id } : c,
        ),
      };
    } else if (splitState.columns.length < MAX_COLUMNS) {
      const newCol = {
        id: `col-${Date.now()}`,
        bookmarkId: bookmark.id,
        width: 1,
      };
      newSplit = {
        columns: [...splitState.columns, newCol],
        activeColumnId: newCol.id,
      };
    } else {
      newSplit = {
        ...splitState,
        columns: splitState.columns.map((c) =>
          c.id === activeCol.id ? { ...c, bookmarkId: bookmark.id } : c,
        ),
        activeColumnId: activeCol.id,
      };
    }

    if (newSplit.columns.length > MAX_COLUMNS) {
      newSplit = { ...newSplit, columns: newSplit.columns.slice(0, MAX_COLUMNS) };
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
    const { openBookmarks } = useSplitStore.getState();
    const { splitState } = useSplitStore.getState();
    const activeCol = splitState.columns.find((c) => c.id === splitState.activeColumnId);
    if (!activeCol?.bookmarkId) return null;
    return openBookmarks.find((b) => b.id === activeCol.bookmarkId) ?? null;
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
