import { create } from 'zustand';
import type { SplitState, SplitColumn } from '../components/split-view/types';
import type { Bookmark } from '../types';

const SPLIT_STATE_KEY = 'bookmarkx-split-state';
const MAX_COLUMNS = 3;

export function computeOpenBookmarks(
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

interface SplitStore {
  splitState: SplitState;
  openBookmarks: Bookmark[];

  setSplitState: (state: SplitState | ((prev: SplitState) => SplitState)) => void;
  setOpenBookmarks: (bookmarks: Bookmark[] | ((prev: Bookmark[]) => Bookmark[])) => void;
  handleSplitColumn: (columnId: string, bookmarkId: string) => void;
  handleMergeColumn: (columnId: string) => void;
  handleTabCloseTab: (columnId: string, bookmarkId: string) => void;
  handleTabCloseBatch: (columnId: string, bookmarkIds: string[]) => void;
  handleColumnActive: (columnId: string) => void;
  handleColumnResize: (columnId: string, width: number) => void;
  handleColumnResizeBatch: (updates: Array<{ columnId: string; width: number }>) => void;
}

export const useSplitStore = create<SplitStore>((set) => ({
  splitState: loadSplitState() ?? {
    columns: [{ id: 'col-1', bookmarkId: null, width: 1 }],
    activeColumnId: 'col-1',
  },
  openBookmarks: [],

  setSplitState: (stateOrFn) =>
    set((state) => {
      const next = typeof stateOrFn === 'function' ? stateOrFn(state.splitState) : stateOrFn;
      saveSplitState(next);
      return { splitState: next };
    }),

  setOpenBookmarks: (bookmarksOrFn) =>
    set((state) => ({
      openBookmarks:
        typeof bookmarksOrFn === 'function'
          ? bookmarksOrFn(state.openBookmarks)
          : bookmarksOrFn,
    })),

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
}));

export type { SplitState, SplitColumn };
