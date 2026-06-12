import { create } from 'zustand';
import type { Bookmark } from '../types';
import type { BookmarkDetailData } from '../components/bookmark-detail/types';
import type { SplitState, SplitColumn } from '../components/split-view/types';
import { mockBookmarks } from '../mockData';

const MOCK_MODE_KEY = 'bookmarkx-mock-mode';
const SPLIT_STATE_KEY = 'bookmarkx-split-state';
const MAX_COLUMNS = 3;

function loadSplitState(): SplitState | null {
  try {
    const raw = localStorage.getItem(SPLIT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.columns?.length > 0 && parsed?.activeColumnId) return parsed;
  } catch {
    // localStorage may be unavailable
  }
  return null;
}

function saveSplitState(state: SplitState): void {
  try {
    localStorage.setItem(SPLIT_STATE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable
  }
}

interface BookmarkStore {
  bookmarks: Bookmark[];
  openBookmarks: Bookmark[];
  splitState: SplitState;
  refreshKey: number;
  mockMode: boolean;

  setBookmarks: (bookmarks: Bookmark[]) => void;
  setOpenBookmarks: (bookmarks: Bookmark[] | ((prev: Bookmark[]) => Bookmark[])) => void;
  setSplitState: (state: SplitState | ((prev: SplitState) => SplitState)) => void;
  incrementRefreshKey: () => void;
  setMockMode: (mode: boolean | ((prev: boolean) => boolean)) => void;

  handleBookmarkSelect: (bookmark: Bookmark) => void;
  handleBookmarkChange: (bookmarkId: string, updated: Partial<BookmarkDetailData>) => void;
  handleSplitColumn: (columnId: string, bookmarkId: string) => void;
  handleMergeColumn: (columnId: string) => void;
  handleColumnActive: (columnId: string) => void;
  handleColumnResize: (columnId: string, width: number) => void;

  getActiveBookmark: () => Bookmark | null;
  fetchBookmarks: () => Promise<void>;
}

export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  bookmarks: [],
  openBookmarks: [],
  splitState: loadSplitState() ?? {
    columns: [{ id: 'col-1', bookmarkId: null, width: 1 }],
    activeColumnId: 'col-1',
  },
  refreshKey: 0,
  mockMode: (() => {
    try {
      return localStorage.getItem(MOCK_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  })(),

  setBookmarks: (bookmarks) => set({ bookmarks }),
  setOpenBookmarks: (bookmarksOrFn) =>
    set((state) => ({
      openBookmarks:
        typeof bookmarksOrFn === 'function'
          ? bookmarksOrFn(state.openBookmarks)
          : bookmarksOrFn,
    })),
  setSplitState: (stateOrFn) =>
    set((state) => {
      const next = typeof stateOrFn === 'function' ? stateOrFn(state.splitState) : stateOrFn;
      saveSplitState(next);
      return { splitState: next };
    }),
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
    const { openBookmarks, splitState } = get();
    const exists = openBookmarks.find((b) => b.id === bookmark.id);
    const newOpen = exists ? openBookmarks : [...openBookmarks, bookmark];

    let newSplit: SplitState;
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
      const newCol: SplitColumn = {
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

    saveSplitState(newSplit);
    set({ openBookmarks: newOpen, splitState: newSplit });
  },

  handleBookmarkChange: (bookmarkId, updated) => {
    set((state) => ({
      openBookmarks: state.openBookmarks.map((b) =>
        b.id === bookmarkId ? { ...b, ...updated } : b,
      ),
      bookmarks: state.bookmarks.map((b) =>
        b.id === bookmarkId ? { ...b, ...updated } : b,
      ),
    }));
  },

  handleSplitColumn: (columnId, bookmarkId) => {
    set((state) => {
      if (state.splitState.columns.length >= MAX_COLUMNS) return state;
      const sourceCol = state.splitState.columns.find((c) => c.id === columnId);
      if (!sourceCol) return state;
      const newCol: SplitColumn = {
        id: `col-${Date.now()}`,
        bookmarkId,
        width: 1,
      };
      const newCols = state.splitState.columns.map((c) =>
        c.id === columnId ? { ...c, width: c.width } : c,
      );
      const idx = newCols.findIndex((c) => c.id === columnId);
      newCols.splice(idx + 1, 0, newCol);
      const newSplit = { columns: newCols, activeColumnId: newCol.id };
      saveSplitState(newSplit);
      return { splitState: newSplit };
    });
  },

  handleMergeColumn: (columnId) => {
    set((state) => {
      if (state.splitState.columns.length === 0) return state;
      if (state.splitState.columns.length === 1) {
        const newSplit: SplitState = {
          columns: [{ ...state.splitState.columns[0], bookmarkId: null }],
          activeColumnId: state.splitState.columns[0].id,
        };
        saveSplitState(newSplit);
        return { splitState: newSplit };
      }
      const col = state.splitState.columns.find((c) => c.id === columnId);
      const newOpen = col?.bookmarkId
        ? state.openBookmarks.filter((b) => b.id !== col.bookmarkId)
        : state.openBookmarks;
      const remaining = state.splitState.columns.filter((c) => c.id !== columnId);
      const newActive =
        state.splitState.activeColumnId === columnId
          ? remaining[remaining.length - 1].id
          : state.splitState.activeColumnId;
      const newSplit: SplitState = { columns: remaining, activeColumnId: newActive };
      saveSplitState(newSplit);
      return { splitState: newSplit, openBookmarks: newOpen };
    });
  },

  handleColumnActive: (columnId) => {
    set((state) => {
      if (state.splitState.activeColumnId === columnId) return state;
      const newSplit = { ...state.splitState, activeColumnId: columnId };
      saveSplitState(newSplit);
      return { splitState: newSplit };
    });
  },

  handleColumnResize: (columnId, width) => {
    set((state) => {
      const newSplit: SplitState = {
        ...state.splitState,
        columns: state.splitState.columns.map((c) =>
          c.id === columnId ? { ...c, width } : c,
        ),
      };
      saveSplitState(newSplit);
      return { splitState: newSplit };
    });
  },

  getActiveBookmark: () => {
    const { splitState, openBookmarks } = get();
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

export type { SplitState, SplitColumn };
