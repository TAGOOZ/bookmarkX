import { describe, it, expect, beforeEach } from 'vitest';
import { useSplitStore, computeOpenBookmarks } from '../splitStore';
import type { Bookmark } from '../../types';
import type { SplitColumn } from '../../components/split-view/types';

const bookmark1: Bookmark = {
  id: 'b1',
  title: 'First',
  titleAr: null,
  titleEn: 'First',
  url: 'https://a.com',
  topic: 'tech',
  priority: 'high',
  contentType: 'article',
  content: '',
  createdAt: '',
};

const bookmark2: Bookmark = {
  id: 'b2',
  title: 'Second',
  titleAr: null,
  titleEn: 'Second',
  url: 'https://b.com',
  topic: 'design',
  priority: 'medium',
  contentType: 'video',
  content: '',
  createdAt: '',
};

const bookmark3: Bookmark = {
  id: 'b3',
  title: 'Third',
  titleAr: null,
  titleEn: 'Third',
  url: 'https://c.com',
  topic: 'science',
  priority: 'low',
  contentType: 'article',
  content: '',
  createdAt: '',
};

function resetStore() {
  useSplitStore.setState({
    splitState: {
      columns: [{ id: 'col-1', bookmarkId: null, tabs: [], activeTabId: null, width: 1 }],
      activeColumnId: 'col-1',
    },
    openBookmarks: [],
  });
}

beforeEach(() => {
  resetStore();
});

describe('splitStore', () => {
  describe('computeOpenBookmarks', () => {
    it('returns bookmarks referenced by columns', () => {
      const cols: SplitColumn[] = [
        { id: 'c1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 },
        { id: 'c2', bookmarkId: 'b2', tabs: ['b2'], activeTabId: 'b2', width: 1 },
      ];
      const result = computeOpenBookmarks(cols, [bookmark1, bookmark2, bookmark3]);
      expect(result).toHaveLength(2);
      expect(result.map((b) => b.id)).toEqual(['b1', 'b2']);
    });

    it('ignores bookmarks not referenced by any column', () => {
      const cols: SplitColumn[] = [{ id: 'c1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 }];
      const result = computeOpenBookmarks(cols, [bookmark1, bookmark2]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('b1');
    });

    it('filters out columns with null bookmarkId', () => {
      const cols: SplitColumn[] = [
        { id: 'c1', bookmarkId: null, tabs: [], activeTabId: null, width: 1 },
        { id: 'c2', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 },
      ];
      const result = computeOpenBookmarks(cols, [bookmark1]);
      expect(result).toHaveLength(1);
    });
  });

  describe('setSplitState', () => {
    it('sets state with an object', () => {
      const newState = {
        columns: [{ id: 'c1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 }],
        activeColumnId: 'c1',
      };
      useSplitStore.getState().setSplitState(newState);
      expect(useSplitStore.getState().splitState).toEqual(newState);
    });

    it('sets state with a function', () => {
      useSplitStore.getState().setSplitState((prev) => ({
        ...prev,
        activeColumnId: 'custom-id',
      }));
      expect(useSplitStore.getState().splitState.activeColumnId).toBe('custom-id');
    });
  });

  describe('setOpenBookmarks', () => {
    it('sets openBookmarks with an array', () => {
      useSplitStore.getState().setOpenBookmarks([bookmark1]);
      expect(useSplitStore.getState().openBookmarks).toHaveLength(1);
    });

    it('sets openBookmarks with a function', () => {
      useSplitStore.getState().setOpenBookmarks([bookmark1]);
      useSplitStore.getState().setOpenBookmarks((prev) => [...prev, bookmark2]);
      expect(useSplitStore.getState().openBookmarks).toHaveLength(2);
    });
  });

  describe('handleSplitColumn', () => {
    it('inserts new column after source column', () => {
      useSplitStore.getState().setSplitState({
        columns: [{ id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 }],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleSplitColumn('col-1', 'b2');
      const { splitState } = useSplitStore.getState();
      expect(splitState.columns).toHaveLength(2);
      expect(splitState.columns[0].id).toBe('col-1');
      expect(splitState.columns[1].bookmarkId).toBe('b2');
    });

    it('sets activeColumnId to the new column', () => {
      useSplitStore.getState().setSplitState({
        columns: [{ id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 }],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleSplitColumn('col-1', 'b2');
      const { splitState } = useSplitStore.getState();
      expect(splitState.activeColumnId).toBe(splitState.columns[1].id);
    });

    it('does not split when at MAX_COLUMNS (3)', () => {
      useSplitStore.getState().setSplitState({
        columns: [
          { id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 },
          { id: 'col-2', bookmarkId: 'b2', tabs: ['b2'], activeTabId: 'b2', width: 1 },
          { id: 'col-3', bookmarkId: 'b3', tabs: ['b3'], activeTabId: 'b3', width: 1 },
        ],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleSplitColumn('col-1', 'b1');
      expect(useSplitStore.getState().splitState.columns).toHaveLength(3);
    });

    it('does nothing if source column does not exist', () => {
      useSplitStore.getState().handleSplitColumn('nonexistent', 'b1');
      expect(useSplitStore.getState().splitState.columns).toHaveLength(1);
    });
  });

  describe('handleMergeColumn', () => {
    it('removes column when multiple exist', () => {
      useSplitStore.getState().setSplitState({
        columns: [
          { id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 },
          { id: 'col-2', bookmarkId: 'b2', tabs: ['b2'], activeTabId: 'b2', width: 1 },
        ],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().setOpenBookmarks([bookmark1, bookmark2]);
      useSplitStore.getState().handleMergeColumn('col-2');
      const { splitState, openBookmarks } = useSplitStore.getState();
      expect(splitState.columns).toHaveLength(1);
      expect(openBookmarks).toHaveLength(1);
      expect(openBookmarks[0].id).toBe('b1');
    });

    it('clears bookmarkId when closing the only column', () => {
      useSplitStore.getState().setSplitState({
        columns: [{ id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 }],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().setOpenBookmarks([bookmark1]);
      useSplitStore.getState().handleMergeColumn('col-1');
      const { splitState, openBookmarks } = useSplitStore.getState();
      expect(splitState.columns).toHaveLength(1);
      expect(splitState.columns[0].bookmarkId).toBeNull();
      expect(openBookmarks).toHaveLength(0);
    });

    it('updates activeColumnId when active column is closed', () => {
      useSplitStore.getState().setSplitState({
        columns: [
          { id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 },
          { id: 'col-2', bookmarkId: 'b2', tabs: ['b2'], activeTabId: 'b2', width: 1 },
        ],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleMergeColumn('col-1');
      const { splitState } = useSplitStore.getState();
      expect(splitState.activeColumnId).toBe('col-2');
    });

    it('collapses to single column when all remaining are empty', () => {
      useSplitStore.getState().setSplitState({
        columns: [
          { id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 },
          { id: 'col-2', bookmarkId: null, tabs: [], activeTabId: null, width: 1 },
          { id: 'col-3', bookmarkId: null, tabs: [], activeTabId: null, width: 1 },
        ],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleMergeColumn('col-1');
      const { splitState } = useSplitStore.getState();
      expect(splitState.columns).toHaveLength(1);
    });
  });

  describe('handleTabCloseTab', () => {
    it('clears bookmarkId when closing tab in single column', () => {
      useSplitStore.getState().setSplitState({
        columns: [{ id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 }],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().setOpenBookmarks([bookmark1]);
      useSplitStore.getState().handleTabCloseTab('col-1', 'b1');
      const { splitState, openBookmarks } = useSplitStore.getState();
      expect(splitState.columns[0].bookmarkId).toBeNull();
      expect(openBookmarks).toHaveLength(0);
    });

    it('clears bookmarkId when closing tab in multi-column', () => {
      useSplitStore.getState().setSplitState({
        columns: [
          { id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 },
          { id: 'col-2', bookmarkId: 'b2', tabs: ['b2'], activeTabId: 'b2', width: 1 },
        ],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleTabCloseTab('col-1', 'b1');
      expect(useSplitStore.getState().splitState.columns[0].bookmarkId).toBeNull();
      expect(useSplitStore.getState().splitState.columns).toHaveLength(2);
    });

    it('updates activeColumnId if active column tab is closed', () => {
      useSplitStore.getState().setSplitState({
        columns: [
          { id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 },
          { id: 'col-2', bookmarkId: 'b2', tabs: ['b2'], activeTabId: 'b2', width: 1 },
        ],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleTabCloseTab('col-1', 'b1');
      const { splitState } = useSplitStore.getState();
      expect(splitState.activeColumnId).toBe('col-2');
    });

    it('does nothing for nonexistent column', () => {
      useSplitStore.getState().handleTabCloseTab('nonexistent', 'b1');
      expect(useSplitStore.getState().splitState.columns).toHaveLength(1);
    });
  });

  describe('handleTabCloseBatch', () => {
    it('clears column bookmarkId when batch includes it', () => {
      useSplitStore.getState().setSplitState({
        columns: [{ id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 }],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().setOpenBookmarks([bookmark1]);
      useSplitStore.getState().handleTabCloseBatch('col-1', ['b1']);
      const { splitState, openBookmarks } = useSplitStore.getState();
      expect(splitState.columns[0].bookmarkId).toBeNull();
      expect(openBookmarks).toHaveLength(0);
    });

    it('does not clear column when batch does not include its bookmark', () => {
      useSplitStore.getState().setSplitState({
        columns: [{ id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 }],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().setOpenBookmarks([bookmark1]);
      useSplitStore.getState().handleTabCloseBatch('col-1', ['b2']);
      expect(useSplitStore.getState().splitState.columns[0].bookmarkId).toBe('b1');
    });
  });

  describe('handleColumnActive', () => {
    it('updates activeColumnId', () => {
      useSplitStore.getState().handleColumnActive('col-2');
      expect(useSplitStore.getState().splitState.activeColumnId).toBe('col-2');
    });

    it('does not update if already active', () => {
      useSplitStore.getState().handleColumnActive('col-1');
      expect(useSplitStore.getState().splitState.activeColumnId).toBe('col-1');
    });
  });

  describe('handleColumnResize', () => {
    it('updates column width', () => {
      useSplitStore.getState().handleColumnResize('col-1', 0.5);
      const col = useSplitStore.getState().splitState.columns.find((c) => c.id === 'col-1');
      expect(col?.width).toBe(0.5);
    });

    it('does not affect other columns', () => {
      useSplitStore.getState().setSplitState({
        columns: [
          { id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 },
          { id: 'col-2', bookmarkId: 'b2', tabs: ['b2'], activeTabId: 'b2', width: 1 },
        ],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleColumnResize('col-1', 0.3);
      const col2 = useSplitStore.getState().splitState.columns.find((c) => c.id === 'col-2');
      expect(col2?.width).toBe(1);
    });
  });

  describe('handleColumnResizeBatch', () => {
    it('updates multiple columns at once', () => {
      useSplitStore.getState().setSplitState({
        columns: [
          { id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 },
          { id: 'col-2', bookmarkId: 'b2', tabs: ['b2'], activeTabId: 'b2', width: 1 },
        ],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleColumnResizeBatch([
        { columnId: 'col-1', width: 0.4 },
        { columnId: 'col-2', width: 0.6 },
      ]);
      const { columns } = useSplitStore.getState().splitState;
      expect(columns[0].width).toBe(0.4);
      expect(columns[1].width).toBe(0.6);
    });

    it('ignores updates for nonexistent columns', () => {
      useSplitStore.getState().handleColumnResizeBatch([
        { columnId: 'nonexistent', width: 0.5 },
      ]);
      const col = useSplitStore.getState().splitState.columns.find((c) => c.id === 'col-1');
      expect(col?.width).toBe(1);
    });
  });

  describe('column limit enforcement', () => {
    it('cannot exceed MAX_COLUMNS (3) via splitColumn', () => {
      useSplitStore.getState().setSplitState({
        columns: [
          { id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 },
          { id: 'col-2', bookmarkId: 'b2', tabs: ['b2'], activeTabId: 'b2', width: 1 },
          { id: 'col-3', bookmarkId: 'b3', tabs: ['b3'], activeTabId: 'b3', width: 1 },
        ],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleSplitColumn('col-1', 'b1');
      expect(useSplitStore.getState().splitState.columns).toHaveLength(3);
    });
  });

  describe('integration', () => {
    it('split then merge returns to original column count', () => {
      useSplitStore.getState().setSplitState({
        columns: [{ id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 }],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleSplitColumn('col-1', 'b2');
      expect(useSplitStore.getState().splitState.columns).toHaveLength(2);
      const secondColId = useSplitStore.getState().splitState.columns[1].id;
      useSplitStore.getState().handleMergeColumn(secondColId);
      expect(useSplitStore.getState().splitState.columns).toHaveLength(1);
    });

    it('openBookmarks updates correctly through split and merge cycle', () => {
      useSplitStore.getState().setSplitState({
        columns: [{ id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 }],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().setOpenBookmarks([bookmark1]);
      useSplitStore.getState().handleSplitColumn('col-1', 'b2');
      useSplitStore.getState().setOpenBookmarks([bookmark1, bookmark2]);
      const secondColId = useSplitStore.getState().splitState.columns[1].id;
      useSplitStore.getState().handleMergeColumn(secondColId);
      const { openBookmarks } = useSplitStore.getState();
      expect(openBookmarks).toHaveLength(1);
      expect(openBookmarks[0].id).toBe('b1');
    });

    it('resize after split updates both columns', () => {
      useSplitStore.getState().setSplitState({
        columns: [{ id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 }],
        activeColumnId: 'col-1',
      });
      useSplitStore.getState().handleSplitColumn('col-1', 'b2');
      const cols = useSplitStore.getState().splitState.columns;
      expect(cols).toHaveLength(2);
      useSplitStore.getState().handleColumnResize(cols[0].id, 0.3);
      useSplitStore.getState().handleColumnResize(cols[1].id, 0.7);
      const updated = useSplitStore.getState().splitState.columns;
      expect(updated[0].width).toBe(0.3);
      expect(updated[1].width).toBe(0.7);
    });
  });
});
