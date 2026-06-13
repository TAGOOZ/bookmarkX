import React, { useCallback, useEffect, useMemo, useState } from 'react';
import BookmarkDetail from '../bookmark-detail/BookmarkDetail';
import BookmarkTabs from '../bookmark-detail/BookmarkTabs';
import SplitDivider from './SplitDivider';
import type { SplitLayoutProps, SplitColumn } from './types';
import type { BookmarkDetailData } from '../bookmark-detail/types';
import type { Bookmark } from '../../types';
import { useSplitStore } from '../../stores/splitStore';
import styles from './SplitLayout.module.css';

const MIN_COLUMN_WIDTH = 300;
const MAX_COLUMNS = 3;

const SplitLayout: React.FC<SplitLayoutProps> = ({
  splitState,
  openBookmarks,
  onSplitColumn,
  onMergeColumn,
  onTabCloseTab,
  onTabCloseBatch,
  onReopenClosedTab,
  onColumnActive,
  onColumnResize,
  onColumnResizeBatch,
  onBookmarkChange,
  dir,
}) => {
  const [activeDropZone, setActiveDropZone] = useState<'left' | 'right' | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleDragStart = () => setIsDragging(true);
    const handleDragEnd = () => setIsDragging(false);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    return () => {
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);

  const handleBookmarkSelect = useCallback((_columnId: string, bookmarkId: string) => {
    const { splitState: current, setSplitState } = useSplitStore.getState();
    setSplitState({
      ...current,
      activeColumnId: _columnId,
      columns: current.columns.map((c: SplitColumn) =>
        c.id === _columnId
          ? { ...c, activeTabId: bookmarkId }
          : c,
      ),
    });
  }, []);

  const handleTabClose = useCallback((columnId: string, bookmarkId: string) => {
    if (onTabCloseTab) {
      onTabCloseTab(columnId, bookmarkId);
    } else {
      onMergeColumn(columnId);
    }
  }, [onTabCloseTab, onMergeColumn]);

  const totalWidth = useMemo(
    () => splitState.columns.reduce((sum, col) => sum + col.width, 0),
    [splitState.columns],
  );

  const isMaxColumns = splitState.columns.length >= MAX_COLUMNS;
  const isSingleColumn = splitState.columns.length === 1;

  const handleDragOver = useCallback((e: React.DragEvent, edge: 'left' | 'right') => {
    e.preventDefault();
    const hasBookmarkId = e.dataTransfer.types.includes('text/tab-bookmark-id');
    if (hasBookmarkId && !isMaxColumns) {
      e.dataTransfer.dropEffect = 'move';
      setActiveDropZone(edge);
    }
  }, [isMaxColumns]);

  const handleDragLeave = useCallback(() => {
    setActiveDropZone(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, edge: 'left' | 'right') => {
    e.preventDefault();
    setActiveDropZone(null);
    const bookmarkId = e.dataTransfer.getData('text/tab-bookmark-id');
    const sourceColumnId = e.dataTransfer.getData('text/tab-column-id');
    if (!bookmarkId || isMaxColumns) return;

    const targetColumn = edge === 'right'
      ? splitState.columns[splitState.columns.length - 1]
      : splitState.columns[0];

    if (targetColumn && targetColumn.id === sourceColumnId) return;

    if (targetColumn) {
      onSplitColumn(targetColumn.id, bookmarkId);
    }
  }, [isMaxColumns, splitState.columns, onSplitColumn]);

  return (
    <div
      className={styles.container}
      dir={dir}
      onMouseEnter={() => {
        if (splitState.columns.length > 0 && !splitState.columns.find(c => c.id === splitState.activeColumnId)) {
          onColumnActive(splitState.columns[0].id);
        }
      }}
    >
      {!isSingleColumn && (
        <div
          className={`${styles.dropZone} ${!isDragging ? styles.dropZoneCollapsed : ''} ${activeDropZone === 'left' ? styles.dropZoneActive : ''}`}
          data-drop-zone="left"
          aria-disabled={isMaxColumns}
          onDragOver={(e) => handleDragOver(e, 'left')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'left')}
        />
      )}
      {splitState.columns.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📑</div>
          <p>{dir === 'rtl' ? 'اختر إشارات مرجعية من القائمة' : 'Select bookmarks from the sidebar'}</p>
        </div>
      )}
      {splitState.columns.map((column, index) => {
        const bookmark = column.activeTabId
          ? openBookmarks.find(b => b.id === column.activeTabId) ?? null
          : null;

        const columnBookmarks = column.tabs
          .map((id) => openBookmarks.find((b) => b.id === id))
          .filter((b): b is Bookmark => b !== undefined);

        const isActive = column.id === splitState.activeColumnId;

        if (isSingleColumn) {
          return (
            <div
              key={column.id}
              className={styles.singleColumn}
              onPointerEnter={() => onColumnActive(column.id)}
            >
              {column.tabs.length > 0 && (
                <BookmarkTabs
                  openBookmarks={columnBookmarks}
                  activeBookmarkId={column.activeTabId}
                  onTabSelect={(id) => handleBookmarkSelect(column.id, id)}
                  onTabClose={(id) => handleTabClose(column.id, id)}
                  onTabCloseBatch={onTabCloseBatch ? (ids) => onTabCloseBatch(column.id, ids) : undefined}
                  onReopenClosedTab={onReopenClosedTab}
                  onSplitColumn={(id) => onSplitColumn(column.id, id)}
                  columnId={column.id}
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
          );
        }

        const flexBasis = `${(column.width / totalWidth) * 100}%`;
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
                    if (onColumnResizeBatch) {
                      onColumnResizeBatch([
                        { columnId: prevCol.id, width: newPrevWidth },
                        { columnId: currentCol.id, width: newCurrentWidth },
                      ]);
                    } else {
                      onColumnResize(prevCol.id, newPrevWidth);
                      onColumnResize(currentCol.id, newCurrentWidth);
                    }
                  }
                }}
              />
            )}
            <div
              className={`${styles.column} ${isActive ? styles.columnActive : ''}`}
              style={{ flex: `0 0 ${flexBasis}` }}
              onPointerEnter={() => onColumnActive(column.id)}
            >
              {column.tabs.length > 0 && (
                <BookmarkTabs
                  openBookmarks={columnBookmarks}
                  activeBookmarkId={column.activeTabId}
                  onTabSelect={(id) => handleBookmarkSelect(column.id, id)}
                  onTabClose={(id) => handleTabClose(column.id, id)}
                  onTabCloseBatch={onTabCloseBatch ? (ids) => onTabCloseBatch(column.id, ids) : undefined}
                  onReopenClosedTab={onReopenClosedTab}
                  onSplitColumn={(id) => onSplitColumn(column.id, id)}
                  columnId={column.id}
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
      {!isSingleColumn && (
        <div
          className={`${styles.dropZone} ${!isDragging ? styles.dropZoneCollapsed : ''} ${activeDropZone === 'right' ? styles.dropZoneActive : ''}`}
          data-drop-zone="right"
          aria-disabled={isMaxColumns}
          onDragOver={(e) => handleDragOver(e, 'right')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, 'right')}
        />
      )}
    </div>
  );
};

export default SplitLayout;
