import React from 'react';
import { Bookmark } from '../../App';
import styles from './BookmarkTabs.module.css';

interface BookmarkTabsProps {
  openBookmarks: Bookmark[];
  activeBookmarkId: string | null;
  onTabSelect: (bookmarkId: string) => void;
  onTabClose: (bookmarkId: string) => void;
  dir?: 'ltr' | 'rtl';
}

function truncateTitle(title: string, maxLen = 32): string {
  if (title.length <= maxLen) return title;
  return title.slice(0, maxLen) + '…';
}

const BookmarkTabs: React.FC<BookmarkTabsProps> = ({
  openBookmarks,
  activeBookmarkId,
  onTabSelect,
  onTabClose,
  dir = 'ltr',
}) => {
  if (openBookmarks.length === 0) return null;

  return (
    <div
      className={`${styles.tabBar} ${dir === 'rtl' ? styles.rtl : ''}`}
      role="tablist"
      aria-label="Open bookmarks"
      dir={dir}
    >
      {openBookmarks.map((bookmark) => {
        const isActive = bookmark.id === activeBookmarkId;
        return (
          <div
            key={bookmark.id}
            className={`${styles.tab} ${isActive ? styles.active : ''}`}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabSelect(bookmark.id)}
          >
            <span className={styles.tabTitle}>{truncateTitle(bookmark.title)}</span>
            <button
              className={styles.closeBtn}
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(bookmark.id);
              }}
              aria-label={`Close ${bookmark.title}`}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default BookmarkTabs;
