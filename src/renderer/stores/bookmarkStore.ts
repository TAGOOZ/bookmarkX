import { create } from 'zustand';
import type { Bookmark } from '../types';
import type { BookmarkDetailData } from '../components/bookmark-detail/types';
import type { SplitState, SplitColumn } from '../components/split-view/types';
import { mockBookmarks } from '../mockData';

const MOCK_MODE_KEY = 'bookmarkx-mock-mode';
const SPLIT_STATE_KEY = 'bookmarkx-split-state';
const MAX_COLUMNS = 3;

function computeOpenBookmarks(
  columns: SplitColumn[],
  bookmarks: Bookmark[],
): Bookmark[] {
  const referencedIds = new Set(
    columns
      .map((c) => c.bookmarkId)
      .filter((id): id is string => id !== null),
  );
  return bookmarks.filter((b) => referencedIds.has(b.id));
}

function loadSplitState(): SplitState | null {
  try {
    const raw = localStorage.getItem(SPLIT_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.columns?.length > 0 && parsed?.activeColumnId) {
      if (parsed.columns.length > MAX_COLUMNS) {
        parsed.columns = parsed.columns.slice(0, MAX_COLUMNS);
      }
      return parsed;
    }
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
  handleColumnResizeBatch: (updates: Array<{ columnId: string; width: number }>) => void;
  handleTabCloseTab: (columnId: string, bookmarkId: string) => void;
  handleTabCloseBatch: (columnId: string, bookmarkIds: string[]) => void;

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
    const { splitState } = get();

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

    // Safety: truncate columns if somehow > MAX_COLUMNS
    if (newSplit.columns.length > MAX_COLUMNS) {
      newSplit = { ...newSplit, columns: newSplit.columns.slice(0, MAX_COLUMNS) };
    }

    // Derive openBookmarks from columns to prevent stale entries
    // Include the current bookmark temporarily so computeOpenBookmarks can find it
    const newOpen = (() => {
      const currentOpen = get().openBookmarks;
      const bookmarkInOpen = currentOpen.find((b) => b.id === bookmark.id);
      const withBookmark = bookmarkInOpen ? currentOpen : [...currentOpen, bookmark];
      return computeOpenBookmarks(newSplit.columns, withBookmark);
    })();

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
      // Ensure the bookmark is in openBookmarks
      const bookmark = state.openBookmarks.find((b) => b.id === bookmarkId);
      const newOpen = bookmark
        ? state.openBookmarks
        : (() => {
            const full = state.bookmarks.find((b) => b.id === bookmarkId);
            return full ? [...state.openBookmarks, full] : state.openBookmarks;
          })();
      saveSplitState(newSplit);
      return { splitState: newSplit, openBookmarks: newOpen };
    });
  },

  handleMergeColumn: (columnId) => {
    set((state) => {
      if (state.splitState.columns.length === 0) return state;
      if (state.splitState.columns.length === 1) {
        const clearedCol: SplitColumn = { ...state.splitState.columns[0], bookmarkId: null };
        const newSplit: SplitState = {
          columns: [clearedCol],
          activeColumnId: state.splitState.columns[0].id,
        };
        const newOpen = computeOpenBookmarks([clearedCol], state.openBookmarks);
        saveSplitState(newSplit);
        return { splitState: newSplit, openBookmarks: newOpen };
      }
      const remaining = state.splitState.columns.filter((c) => c.id !== columnId);
      const allEmpty = remaining.every((c) => c.bookmarkId === null);
      if (allEmpty) {
        const clearedRemaining: SplitColumn = { ...remaining[0], bookmarkId: null };
        const newSplit: SplitState = {
          columns: [clearedRemaining],
          activeColumnId: remaining[0].id,
        };
        const newOpen = computeOpenBookmarks([clearedRemaining], state.openBookmarks);
        saveSplitState(newSplit);
        return { splitState: newSplit, openBookmarks: newOpen };
      }
      const newActive =
        state.splitState.activeColumnId === columnId
          ? remaining[remaining.length - 1].id
          : state.splitState.activeColumnId;
      const newSplit: SplitState = { columns: remaining, activeColumnId: newActive };
      const newOpen = computeOpenBookmarks(remaining, state.openBookmarks);
      saveSplitState(newSplit);
      return { splitState: newSplit, openBookmarks: newOpen };
    });
  },

  handleTabCloseTab: (columnId, _bookmarkId) => {
    set((state) => {
      const col = state.splitState.columns.find((c) => c.id === columnId);
      if (!col) return state;

      if (state.splitState.columns.length === 1) {
        const clearedCol: SplitColumn = { ...col, bookmarkId: null };
        const newSplit: SplitState = {
          columns: [clearedCol],
          activeColumnId: col.id,
        };
        const newOpen = computeOpenBookmarks([clearedCol], state.openBookmarks);
        saveSplitState(newSplit);
        return { splitState: newSplit, openBookmarks: newOpen };
      }

      const newColumns = state.splitState.columns.map((c) =>
        c.id === columnId ? { ...c, bookmarkId: null } : c,
      );

      let newActiveId = state.splitState.activeColumnId;
      if (newActiveId === columnId) {
        const firstWithBookmark = newColumns.find((c) => c.bookmarkId);
        newActiveId = firstWithBookmark?.id ?? newColumns[0].id;
      }

      const newSplit: SplitState = { columns: newColumns, activeColumnId: newActiveId };
      const newOpen = computeOpenBookmarks(newColumns, state.openBookmarks);
      saveSplitState(newSplit);
      return { splitState: newSplit, openBookmarks: newOpen };
    });
  },

  handleTabCloseBatch: (columnId, bookmarkIds) => {
    set((state) => {
      const idsToRemove = new Set(bookmarkIds);

      const col = state.splitState.columns.find((c) => c.id === columnId);
      const shouldClearColumn = col?.bookmarkId && idsToRemove.has(col.bookmarkId);

      const newColumns = shouldClearColumn
        ? state.splitState.columns.map((c) =>
            c.id === columnId ? { ...c, bookmarkId: null } : c,
          )
        : state.splitState.columns;

      const newOpen = computeOpenBookmarks(newColumns, state.openBookmarks);

      let newActiveId = state.splitState.activeColumnId;
      if (shouldClearColumn) {
        const firstWithBookmark = newColumns.find((c) => c.bookmarkId);
        newActiveId = firstWithBookmark?.id ?? newColumns[0].id;
      }

      const newSplit: SplitState = { columns: newColumns, activeColumnId: newActiveId };
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

  handleColumnResizeBatch: (updates) => {
    set((state) => {
      const newSplit: SplitState = {
        ...state.splitState,
        columns: state.splitState.columns.map((c) => {
          const update = updates.find((u) => u.columnId === c.id);
          return update ? { ...c, width: update.width } : c;
        }),
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
