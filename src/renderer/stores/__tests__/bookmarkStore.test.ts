import { describe, it, expect, beforeEach } from 'vitest';
import { useBookmarkStore } from '../bookmarkStore';
import { useSplitStore } from '../splitStore';
import type { Bookmark } from '../../types';

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

beforeEach(() => {
  useBookmarkStore.setState({
    bookmarks: [],
    refreshKey: 0,
    mockMode: false,
  });
  useSplitStore.setState({
    splitState: {
      columns: [{ id: 'col-1', bookmarkId: null, tabs: [], activeTabId: null, width: 1 }],
      activeColumnId: 'col-1',
    },
    openBookmarks: [],
  });
});

describe('bookmarkStore', () => {
  describe('handleBookmarkSelect', () => {
    it('adds bookmark to openBookmarks', () => {
      useBookmarkStore.getState().handleBookmarkSelect(bookmark1);
      const { openBookmarks } = useSplitStore.getState();
      expect(openBookmarks).toHaveLength(1);
      expect(openBookmarks[0].id).toBe('b1');
    });

    it('does not duplicate existing bookmark', () => {
      useBookmarkStore.getState().handleBookmarkSelect(bookmark1);
      useBookmarkStore.getState().handleBookmarkSelect(bookmark1);
      const { openBookmarks } = useSplitStore.getState();
      expect(openBookmarks).toHaveLength(1);
    });

    it('assigns bookmark to empty active column', () => {
      useBookmarkStore.getState().handleBookmarkSelect(bookmark1);
      const { splitState } = useSplitStore.getState();
      expect(splitState.columns[0].bookmarkId).toBe('b1');
      expect(splitState.columns[0].tabs).toEqual(['b1']);
      expect(splitState.columns[0].activeTabId).toBe('b1');
    });

    it('adds bookmark to active column tabs when active column is occupied', () => {
      useBookmarkStore.getState().handleBookmarkSelect(bookmark1);
      useBookmarkStore.getState().handleBookmarkSelect(bookmark2);
      const { splitState } = useSplitStore.getState();
      expect(splitState.columns).toHaveLength(1);
      expect(splitState.columns[0].tabs).toEqual(['b1', 'b2']);
      expect(splitState.columns[0].activeTabId).toBe('b2');
      expect(splitState.columns[0].bookmarkId).toBe('b2');
    });

    it('no-ops when selecting the already active tab', () => {
      useBookmarkStore.getState().handleBookmarkSelect(bookmark1);
      const { splitState: before } = useSplitStore.getState();
      useBookmarkStore.getState().handleBookmarkSelect(bookmark1);
      const { splitState: after } = useSplitStore.getState();
      expect(after.columns[0].tabs).toEqual(before.columns[0].tabs);
      expect(after.columns[0].activeTabId).toBe('b1');
    });
  });

  describe('handleTabCloseTab', () => {
    it('clears column bookmarkId and tabs', () => {
      useBookmarkStore.getState().handleBookmarkSelect(bookmark1);
      useSplitStore.getState().handleTabCloseTab('col-1', 'b1');
      const { splitState } = useSplitStore.getState();
      expect(splitState.columns[0].bookmarkId).toBeNull();
      expect(splitState.columns[0].tabs).toEqual([]);
      expect(splitState.columns[0].activeTabId).toBeNull();
    });

    it('removes bookmark from openBookmarks', () => {
      useBookmarkStore.getState().handleBookmarkSelect(bookmark1);
      useSplitStore.getState().handleTabCloseTab('col-1', 'b1');
      const { openBookmarks } = useSplitStore.getState();
      expect(openBookmarks).toHaveLength(0);
    });
  });

  describe('handleMergeColumn', () => {
    it('clears column bookmarkId on single column', () => {
      useBookmarkStore.getState().handleBookmarkSelect(bookmark1);
      useSplitStore.getState().handleMergeColumn('col-1');
      const { splitState } = useSplitStore.getState();
      expect(splitState.columns[0].bookmarkId).toBeNull();
      expect(splitState.columns[0].tabs).toEqual([]);
      expect(splitState.columns[0].activeTabId).toBeNull();
    });

    it('removes column when multiple columns exist', () => {
      useSplitStore.getState().setSplitState({
        columns: [
          { id: 'col-1', bookmarkId: 'b1', tabs: ['b1'], activeTabId: 'b1', width: 1 },
          { id: 'col-2', bookmarkId: 'b2', tabs: ['b2'], activeTabId: 'b2', width: 1 },
        ],
        activeColumnId: 'col-1',
      });
      const { splitState } = useSplitStore.getState();
      expect(splitState.columns).toHaveLength(2);
      const secondColId = splitState.columns[1].id;
      useSplitStore.getState().handleMergeColumn(secondColId);
      const after = useSplitStore.getState();
      expect(after.splitState.columns).toHaveLength(1);
    });
  });

  describe('handleColumnActive', () => {
    it('updates active column', () => {
      useSplitStore.getState().handleColumnActive('col-new');
      const { splitState } = useSplitStore.getState();
      expect(splitState.activeColumnId).toBe('col-new');
    });

    it('does not update if already active', () => {
      useSplitStore.getState().handleColumnActive('col-1');
      const { splitState } = useSplitStore.getState();
      expect(splitState.activeColumnId).toBe('col-1');
    });
  });
});
