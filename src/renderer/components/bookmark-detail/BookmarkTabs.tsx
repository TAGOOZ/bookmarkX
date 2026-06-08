import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { Bookmark, useLocale } from '../../App';
import styles from './BookmarkTabs.module.css';

interface BookmarkTabsProps {
  openBookmarks: Bookmark[];
  activeBookmarkId: string | null;
  onTabSelect: (bookmarkId: string) => void;
  onTabClose: (bookmarkId: string) => void;
  onTabCloseBatch?: (bookmarkIds: string[]) => void;
  onReopenClosedTab?: (bookmark: Bookmark) => void;
  onSplitColumn?: (bookmarkId: string) => void;
  dir?: 'ltr' | 'rtl';
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  targetBookmarkId: string;
}

const CLOSED_TABS_KEY = 'bookmarkx-closed-tabs';
const MAX_CLOSED = 20;

function loadClosedTabs(): Bookmark[] {
  try {
    const raw = localStorage.getItem(CLOSED_TABS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveClosedTabs(tabs: Bookmark[]): void {
  try {
    localStorage.setItem(CLOSED_TABS_KEY, JSON.stringify(tabs));
  } catch { /* noop */ }
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
  onTabCloseBatch,
  onReopenClosedTab,
  onSplitColumn,
  dir = 'ltr',
}) => {
  const { locale } = useLocale();
  const intl = useIntl();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [closedTabs, setClosedTabs] = useState<Bookmark[]>(loadClosedTabs);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    saveClosedTabs(closedTabs);
  }, [closedTabs]);

  useEffect(() => {
    if (!contextMenu?.visible) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu?.visible]);

  const handleContextMenu = useCallback((e: React.MouseEvent, bookmarkId: string) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, targetBookmarkId: bookmarkId });
  }, []);

  const closeAndTrack = useCallback((bookmarkId: string) => {
    const bookmark = openBookmarks.find((b) => b.id === bookmarkId);
    if (bookmark) {
      setClosedTabs((prev) => {
        const next = [bookmark, ...prev.filter((t) => t.id !== bookmarkId)];
        return next.slice(0, MAX_CLOSED);
      });
    }
    onTabClose(bookmarkId);
  }, [openBookmarks, onTabClose]);

  const handleMenuClose = useCallback(() => {
    if (!contextMenu) return;
    closeAndTrack(contextMenu.targetBookmarkId);
    setContextMenu(null);
  }, [contextMenu, closeAndTrack]);

  const handleMenuCloseAll = useCallback(() => {
    if (!contextMenu) return;
    const ids = openBookmarks.map((b) => b.id);
    setClosedTabs((prev) => {
      const existing = new Set(prev.map((t) => t.id));
      const newClosed = openBookmarks.filter((b) => !existing.has(b.id));
      return [...newClosed, ...prev].slice(0, MAX_CLOSED);
    });
    if (onTabCloseBatch) {
      onTabCloseBatch(ids);
    } else {
      ids.forEach((id) => onTabClose(id));
    }
    setContextMenu(null);
  }, [contextMenu, openBookmarks, onTabClose, onTabCloseBatch]);

  const handleMenuCloseToRight = useCallback(() => {
    if (!contextMenu) return;
    const idx = openBookmarks.findIndex((b) => b.id === contextMenu.targetBookmarkId);
    const ids = openBookmarks.slice(idx + 1).map((b) => b.id);
    setClosedTabs((prev) => {
      const toClose = openBookmarks.slice(idx + 1);
      const existing = new Set(prev.map((t) => t.id));
      const newClosed = toClose.filter((b) => !existing.has(b.id));
      return [...newClosed, ...prev].slice(0, MAX_CLOSED);
    });
    if (onTabCloseBatch) {
      onTabCloseBatch(ids);
    } else {
      ids.forEach((id) => onTabClose(id));
    }
    setContextMenu(null);
  }, [contextMenu, openBookmarks, onTabClose, onTabCloseBatch]);

  const handleMenuCloseToLeft = useCallback(() => {
    if (!contextMenu) return;
    const idx = openBookmarks.findIndex((b) => b.id === contextMenu.targetBookmarkId);
    const ids = openBookmarks.slice(0, idx).map((b) => b.id);
    setClosedTabs((prev) => {
      const toClose = openBookmarks.slice(0, idx);
      const existing = new Set(prev.map((t) => t.id));
      const newClosed = toClose.filter((b) => !existing.has(b.id));
      return [...newClosed, ...prev].slice(0, MAX_CLOSED);
    });
    if (onTabCloseBatch) {
      onTabCloseBatch(ids);
    } else {
      ids.forEach((id) => onTabClose(id));
    }
    setContextMenu(null);
  }, [contextMenu, openBookmarks, onTabClose, onTabCloseBatch]);

  const handleMenuCloseOthers = useCallback(() => {
    if (!contextMenu) return;
    const ids = openBookmarks.filter((b) => b.id !== contextMenu.targetBookmarkId).map((b) => b.id);
    setClosedTabs((prev) => {
      const toClose = openBookmarks.filter((b) => b.id !== contextMenu.targetBookmarkId);
      const existing = new Set(prev.map((t) => t.id));
      const newClosed = toClose.filter((b) => !existing.has(b.id));
      return [...newClosed, ...prev].slice(0, MAX_CLOSED);
    });
    if (onTabCloseBatch) {
      onTabCloseBatch(ids);
    } else {
      ids.forEach((id) => onTabClose(id));
    }
    setContextMenu(null);
  }, [contextMenu, openBookmarks, onTabClose, onTabCloseBatch]);

  const handleMenuReopen = useCallback(() => {
    const last = closedTabs[0];
    if (last && onReopenClosedTab) {
      onReopenClosedTab(last);
      setClosedTabs((prev) => prev.slice(1));
    }
    setContextMenu(null);
  }, [closedTabs, onReopenClosedTab]);

  const handleMenuOpenInNewColumn = useCallback(() => {
    if (!contextMenu || !onSplitColumn) return;
    onSplitColumn(contextMenu.targetBookmarkId);
    setContextMenu(null);
  }, [contextMenu, onSplitColumn]);

  if (openBookmarks.length === 0 && closedTabs.length === 0) return null;

  return (
    <>
      <div
        className={`${styles.tabBar} ${dir === 'rtl' ? styles.rtl : ''}`}
        role="tablist"
        aria-label="Open bookmarks"
        dir={dir}
      >
        {openBookmarks.map((bookmark) => {
          const isActive = bookmark.id === activeBookmarkId;
          const displayTitle = locale === 'ar'
            ? (bookmark.titleAr || bookmark.titleEn || bookmark.title)
            : (bookmark.titleEn || bookmark.titleAr || bookmark.title);
          return (
            <div
              key={bookmark.id}
              className={`${styles.tab} ${isActive ? styles.active : ''}`}
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabSelect(bookmark.id)}
              onContextMenu={(e) => handleContextMenu(e, bookmark.id)}
            >
              <span className={styles.tabTitle}>{truncateTitle(displayTitle)}</span>
              <button
                className={styles.closeBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  closeAndTrack(bookmark.id);
                }}
                aria-label={`Close ${displayTitle}`}
              >
                ×
              </button>
              {onSplitColumn && (
                <button
                  className={styles.splitBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSplitColumn(bookmark.id);
                  }}
                  aria-label={`Open ${displayTitle} in new column`}
                  title={intl.formatMessage({ id: 'openInNewColumn' })}
                >
                  ⧉
                </button>
              )}
            </div>
          );
        })}
      </div>
      {contextMenu?.visible && (
        <div
          ref={menuRef}
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          role="menu"
        >
          <button className={styles.menuItem} onClick={handleMenuClose} role="menuitem">
            {intl.formatMessage({ id: 'closeTab' })}
          </button>
          <button className={styles.menuItem} onClick={handleMenuCloseAll} role="menuitem">
            {intl.formatMessage({ id: 'closeAllTabs' })}
          </button>
          <button className={styles.menuItem} onClick={handleMenuCloseToRight} role="menuitem">
            {intl.formatMessage({ id: 'closeTabsToRight' })}
          </button>
          <button className={styles.menuItem} onClick={handleMenuCloseToLeft} role="menuitem">
            {intl.formatMessage({ id: 'closeTabsToLeft' })}
          </button>
          <button className={styles.menuItem} onClick={handleMenuCloseOthers} role="menuitem">
            {intl.formatMessage({ id: 'closeOtherTabs' })}
          </button>
          <div className={styles.menuSeparator} />
          {onSplitColumn && (
            <button
              className={styles.menuItem}
              onClick={handleMenuOpenInNewColumn}
              role="menuitem"
            >
              {intl.formatMessage({ id: 'openInNewColumn' })}
            </button>
          )}
          <button
            className={styles.menuItem}
            onClick={handleMenuReopen}
            disabled={closedTabs.length === 0}
            role="menuitem"
          >
            {intl.formatMessage({ id: 'reopenClosedTab' })}
          </button>
        </div>
      )}
    </>
  );
};

export default BookmarkTabs;
