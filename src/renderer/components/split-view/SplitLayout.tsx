import React, { useCallback, useMemo } from 'react';
import BookmarkDetail from '../bookmark-detail/BookmarkDetail';
import BookmarkTabs from '../bookmark-detail/BookmarkTabs';
import SplitDivider from './SplitDivider';
import type { SplitLayoutProps } from './types';
import type { BookmarkDetailData } from '../bookmark-detail/types';
import styles from './SplitLayout.module.css';

const MIN_COLUMN_WIDTH = 300;

const SplitLayout: React.FC<SplitLayoutProps> = ({
  splitState,
  openBookmarks,
  onSplitColumn,
  onMergeColumn,
  onColumnActive,
  onColumnResize,
  onBookmarkChange,
  dir,
}) => {
  const handleBookmarkSelect = useCallback((_columnId: string, bookmarkId: string) => {
    onColumnActive(_columnId);
    void bookmarkId;
  }, [onColumnActive]);

  const handleTabClose = useCallback((columnId: string, _bookmarkId: string) => {
    onMergeColumn(columnId);
  }, [onMergeColumn]);

  const totalWidth = useMemo(
    () => splitState.columns.reduce((sum, col) => sum + col.width, 0),
    [splitState.columns],
  );

  return (
    <div
      className={styles.container}
      dir={dir}
      onMouseEnter={() => {
        // Ensure the layout has a valid active column
        if (!splitState.columns.find(c => c.id === splitState.activeColumnId)) {
          onColumnActive(splitState.columns[0]?.id);
        }
      }}
    >
      {splitState.columns.map((column, index) => {
        const bookmark = column.bookmarkId
          ? openBookmarks.find(b => b.id === column.bookmarkId) ?? null
          : null;

        const columnBookmarks = column.bookmarkId
          ? openBookmarks.filter(b => b.id === column.bookmarkId)
          : [];

        const flexBasis = `${(column.width / totalWidth) * 100}%`;
        const isActive = column.id === splitState.activeColumnId;

        return (
          <React.Fragment key={column.id}>
            {index > 0 && (
              <SplitDivider
                dir={dir}
                onResize={(delta) => {
                  const prevCol = splitState.columns[index - 1];
                  const currentCol = splitState.columns[index];
                  const minFlex = MIN_COLUMN_WIDTH / (totalWidth * 10);
                  const newPrevWidth = Math.max(minFlex, prevCol.width + delta / 100);
                  const newCurrentWidth = Math.max(minFlex, currentCol.width - delta / 100);
                  if (prevCol.id && currentCol.id) {
                    onColumnResize(prevCol.id, newPrevWidth);
                    onColumnResize(currentCol.id, newCurrentWidth);
                  }
                }}
              />
            )}
            <div
              className={`${styles.column} ${isActive ? styles.columnActive : ''}`}
              style={{ flex: `0 0 ${flexBasis}` }}
              onPointerEnter={() => onColumnActive(column.id)}
            >
              {column.bookmarkId && (
                <BookmarkTabs
                  openBookmarks={columnBookmarks}
                  activeBookmarkId={column.bookmarkId}
                  onTabSelect={(id) => handleBookmarkSelect(column.id, id)}
                  onTabClose={(id) => handleTabClose(column.id, id)}
                  onSplitColumn={(id) => onSplitColumn(column.id, id)}
                  dir={dir}
                />
              )}
              <BookmarkDetail
                bookmark={bookmark}
                onBookmarkChange={
                  bookmark
                    ? (updated: Partial<BookmarkDetailData>) =>
                        onBookmarkChange(bookmark.id, updated)
                    : undefined
                }
              />
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default SplitLayout;
