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
    columns.flatMap((c) => c.tabs),
  );
  return bookmarks.filter((b) => referencedIds.has(b.id));
}

function migrateColumn(col: SplitColumn & { bookmarkId?: string | null }): SplitColumn {
  if (col.tabs) return { id: col.id, tabs: col.tabs, activeTabId: col.activeTabId, width: col.width };
  const tabs = col.bookmarkId ? [col.bookmarkId] : [];
  return {
    id: col.id,
    tabs,
    activeTabId: col.bookmarkId ?? null,
    width: col.width,
  };
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
      parsed.columns = parsed.columns.map(migrateColumn);
      // Migration: old behavior created a new column per bookmark click.
      // Collapse all tabs into the first column so the user starts with one column.
      if (parsed.columns.length > 1) {
        const allTabs = parsed.columns.flatMap((c: SplitColumn) => c.tabs);
        const activeId = parsed.columns[0].id;
        const activeTabId =
          parsed.columns.find((c: SplitColumn) => c.id === parsed.activeColumnId)?.activeTabId ??
          parsed.columns.find((c: SplitColumn) => c.tabs.length > 0)?.activeTabId ??
          allTabs[0] ??
          null;
        parsed.columns = [{ id: activeId, tabs: allTabs, activeTabId, width: 1 }];
        parsed.activeColumnId = activeId;
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
    columns: [],
    activeColumnId: null,
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

      // Keep bookmark in source column (Obsidian behavior: split duplicates, doesn't move)

      const newCol: SplitColumn = {
        id: `col-${Date.now()}`,
        tabs: [bookmarkId],
        activeTabId: bookmarkId,
        width: 1,
      };

      const newCols = state.splitState.columns.map((c) =>
        c.id === columnId
          ? { ...c } // source stays unchanged
          : c,
      );

      const idx = newCols.findIndex((c) => c.id === columnId);
      newCols.splice(idx + 1, 0, newCol);

      const newSplit = { columns: newCols, activeColumnId: newCol.id };
      const newOpen = computeOpenBookmarks(newCols, state.openBookmarks);
      saveSplitState(newSplit);
      return { splitState: newSplit, openBookmarks: newOpen };
    });
  },

  handleMergeColumn: (columnId) => {
    set((state) => {
      if (state.splitState.columns.length === 0) return state;

      if (state.splitState.columns.length === 1) {
        const newSplit: SplitState = { columns: [], activeColumnId: null };
        saveSplitState(newSplit);
        return { splitState: newSplit, openBookmarks: [] };
      }

      const remaining = state.splitState.columns.filter((c) => c.id !== columnId);
      const allEmpty = remaining.every((c) => c.tabs.length === 0);

      if (allEmpty) {
        const clearedRemaining: SplitColumn = {
          ...remaining[0],
          tabs: [],
          activeTabId: null,
        };
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

  handleTabCloseTab: (columnId, bookmarkId) => {
    set((state) => {
      const col = state.splitState.columns.find((c) => c.id === columnId);
      if (!col) return state;

      const newTabs = col.tabs.filter((id) => id !== bookmarkId);
      let newActiveTabId = col.activeTabId;

      // If we closed the active tab, activate an adjacent one
      if (col.activeTabId === bookmarkId) {
        const closedIdx = col.tabs.indexOf(bookmarkId);
        newActiveTabId = newTabs[Math.min(closedIdx, newTabs.length - 1)] ?? null;
      }

      // If column has no tabs left, handle single-column case
      if (newTabs.length === 0 && state.splitState.columns.length === 1) {
        const clearedCol: SplitColumn = {
          ...col,
          tabs: [],
          activeTabId: null,
        };
        const newSplit: SplitState = {
          columns: [clearedCol],
          activeColumnId: col.id,
        };
        const newOpen = computeOpenBookmarks([clearedCol], state.openBookmarks);
        saveSplitState(newSplit);
        return { splitState: newSplit, openBookmarks: newOpen };
      }

      const newColumns = state.splitState.columns.map((c) =>
        c.id === columnId
          ? { ...c, tabs: newTabs, activeTabId: newActiveTabId }
          : c,
      );

      let newActiveId = state.splitState.activeColumnId;
      if (newActiveId === columnId && newTabs.length === 0) {
        const firstWithTabs = newColumns.find((c) => c.tabs.length > 0);
        newActiveId = firstWithTabs?.id ?? newColumns[0].id;
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

      if (!col) return state;

      const newTabs = col.tabs.filter((id) => !idsToRemove.has(id));
      let newActiveTabId = col.activeTabId;

      if (col.activeTabId && idsToRemove.has(col.activeTabId)) {
        newActiveTabId = newTabs[0] ?? null;
      }

      const newColumns = state.splitState.columns.map((c) =>
        c.id === columnId
          ? { ...c, tabs: newTabs, activeTabId: newActiveTabId }
          : c,
      );

      let newActiveId = state.splitState.activeColumnId;
      if (newActiveId === columnId && newTabs.length === 0) {
        const firstWithTabs = newColumns.find((c) => c.tabs.length > 0);
        newActiveId = firstWithTabs?.id ?? newColumns[0].id;
      }

      const newSplit: SplitState = { columns: newColumns, activeColumnId: newActiveId };
      const newOpen = computeOpenBookmarks(newColumns, state.openBookmarks);
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
