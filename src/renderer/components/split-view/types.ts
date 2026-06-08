import type { Bookmark } from '../../App';
import type { BookmarkDetailData } from '../bookmark-detail/types';

export interface SplitColumn {
  id: string;
  bookmarkId: string | null;
  width: number;
}

export interface SplitState {
  columns: SplitColumn[];
  activeColumnId: string;
}

export interface SplitLayoutProps {
  splitState: SplitState;
  openBookmarks: Bookmark[];
  onSplitColumn: (columnId: string, bookmarkId: string) => void;
  onMergeColumn: (columnId: string) => void;
  onColumnActive: (columnId: string) => void;
  onColumnResize: (columnId: string, width: number) => void;
  onBookmarkChange: (bookmarkId: string, updated: Partial<BookmarkDetailData>) => void;
  dir: 'ltr' | 'rtl';
}

export interface SplitDividerProps {
  onResize: (delta: number) => void;
  dir: 'ltr' | 'rtl';
}
