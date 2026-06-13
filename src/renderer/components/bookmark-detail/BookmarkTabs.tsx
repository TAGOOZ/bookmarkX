import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useIntl } from 'react-intl';
import type { Bookmark } from '../../types';
import { useLocale } from '../../App';
import { useBookmarkStore } from '../../stores/bookmarkStore';
import styles from './BookmarkTabs.module.css';

interface BookmarkTabsProps {
  openBookmarks: Bookmark[];
  activeBookmarkId: string | null;
  onTabSelect: (bookmarkId: string) => void;
  onTabClose: (bookmarkId: string) => void;
  onTabCloseBatch?: (bookmarkIds: string[]) => void;
  onReopenClosedTab?: (bookmark: Bookmark) => void;
  onSplitColumn?: (bookmarkId: string) => void;
  columnId?: string;
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

function loadClosedTabIds(): string[] {
  try {
    const raw = localStorage.getItem(CLOSED_TABS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Backward compat: if it's an array of objects, extract IDs
    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
      return parsed.map((t: Bookmark) => t.id);
    }
    return parsed;
  } catch {
    return [];
  }
}

function saveClosedTabIds(ids: string[]): void {
  try {
    localStorage.setItem(CLOSED_TABS_KEY, JSON.stringify(ids));
  } catch {
    // localStorage may be unavailable
  }
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
  columnId,
  dir = 'ltr',
}) => {
  const { locale } = useLocale();
  const intl = useIntl();
  const allBookmarks = useBookmarkStore((s) => s.bookmarks);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [closedTabIds, setClosedTabIds] = useState<string[]>(loadClosedTabIds);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const openBookmarksRef = useRef(openBookmarks);
  openBookmarksRef.current = openBookmarks;

  const closedTabs = useMemo(() => {
    return closedTabIds.map((id) => {
      const found = allBookmarks.find((b) => b.id === id);
      if (found) return found;
      // Stub for IDs not yet in the store (e.g. before bookmarks load)
      return {
        id,
        title: id,
        titleAr: null,
        titleEn: null,
        url: '',
        topic: '',
        priority: 'medium' as const,
        contentType: 'article' as const,
        content: '',
        createdAt: '',
      };
    });
  }, [closedTabIds, allBookmarks]);

  useEffect(() => {
    saveClosedTabIds(closedTabIds);
  }, [closedTabIds]);

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

  useEffect(() => {
    if (!activeBookmarkId || !tabBarRef.current) return;
    const activeTab = tabBarRef.current.querySelector(`[data-bookmark-id="${activeBookmarkId}"]`);
    if (!activeTab) return;
    const container = tabBarRef.current;
    const tabRect = activeTab.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const isVisible = tabRect.left >= containerRect.left && tabRect.right <= containerRect.right;
    if (!isVisible) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }, [activeBookmarkId]);

  const focusTabAfterClose = useCallback((closedId: string) => {
    const current = openBookmarksRef.current;
    const idx = current.findIndex((b) => b.id === closedId);
    const nextBookmark = current[idx + 1] ?? current[idx - 1];
    if (nextBookmark) {
      const el = tabRefs.current.get(nextBookmark.id);
      if (el) {
        el.focus();
        return;
      }
    }
    tabBarRef.current?.focus();
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, bookmarkId: string) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, targetBookmarkId: bookmarkId });
  }, []);

  const closeAndTrack = useCallback((bookmarkId: string) => {
    setClosedTabIds((prev) => {
      const next = [bookmarkId, ...prev.filter((id) => id !== bookmarkId)];
      return next.slice(0, MAX_CLOSED);
    });
    onTabClose(bookmarkId);
    requestAnimationFrame(() => {
      focusTabAfterClose(bookmarkId);
    });
  }, [onTabClose, focusTabAfterClose]);

  const handleMenuClose = useCallback(() => {
    if (!contextMenu) return;
    closeAndTrack(contextMenu.targetBookmarkId);
    setContextMenu(null);
  }, [contextMenu, closeAndTrack]);

  const handleMenuCloseAll = useCallback(() => {
    if (!contextMenu) return;
    const ids = openBookmarks.map((b) => b.id);
    setClosedTabIds((prev) => {
      const existing = new Set(prev);
      const newIds = ids.filter((id) => !existing.has(id));
      return [...newIds, ...prev].slice(0, MAX_CLOSED);
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
    if (idx === -1) { setContextMenu(null); return; }
    const ids = openBookmarks.slice(idx + 1).map((b) => b.id);
    setClosedTabIds((prev) => {
      const existing = new Set(prev);
      const newIds = ids.filter((id) => !existing.has(id));
      return [...newIds, ...prev].slice(0, MAX_CLOSED);
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
    if (idx === -1) { setContextMenu(null); return; }
    const ids = openBookmarks.slice(0, idx).map((b) => b.id);
    setClosedTabIds((prev) => {
      const existing = new Set(prev);
      const newIds = ids.filter((id) => !existing.has(id));
      return [...newIds, ...prev].slice(0, MAX_CLOSED);
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
    setClosedTabIds((prev) => {
      const existing = new Set(prev);
      const newIds = ids.filter((id) => !existing.has(id));
      return [...newIds, ...prev].slice(0, MAX_CLOSED);
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
      // Skip if already open
      const alreadyOpen = openBookmarks.some((b) => b.id === last.id);
      if (!alreadyOpen) {
        onReopenClosedTab(last);
      }
      // Always remove from closed stack (even if already open — it was closed)
      setClosedTabIds((prev) => prev.slice(1));
    }
    setContextMenu(null);
  }, [closedTabs, onReopenClosedTab, openBookmarks]);

  const handleMenuOpenInNewColumn = useCallback(() => {
    if (!contextMenu || !onSplitColumn) return;
    onSplitColumn(contextMenu.targetBookmarkId);
    setContextMenu(null);
  }, [contextMenu, onSplitColumn]);

  const handleTabKeyDown = useCallback((e: React.KeyboardEvent) => {
    const tabs = openBookmarks;
    if (tabs.length === 0) return;

    const currentIndex = tabs.findIndex((b) => b.id === activeBookmarkId);
    let nextIndex: number | null = null;

    const isRtl = dir === 'rtl';
    const prevKey = isRtl ? 'ArrowRight' : 'ArrowLeft';
    const nextKey = isRtl ? 'ArrowLeft' : 'ArrowRight';

    switch (e.key) {
      case prevKey:
        e.preventDefault();
        nextIndex = currentIndex <= 0 ? tabs.length - 1 : currentIndex - 1;
        break;
      case nextKey:
        e.preventDefault();
        nextIndex = currentIndex >= tabs.length - 1 ? 0 : currentIndex + 1;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = tabs.length - 1;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeBookmarkId) {
          onTabSelect(activeBookmarkId);
        }
        break;
      default:
        return;
    }

    if (nextIndex !== null && tabs[nextIndex]) {
      onTabSelect(tabs[nextIndex].id);
    }
  }, [openBookmarks, activeBookmarkId, onTabSelect, dir]);

  const handleDragStart = useCallback((e: React.DragEvent, bookmarkId: string) => {
    if (!columnId) return;
    e.dataTransfer.setData('text/tab-bookmark-id', bookmarkId);
    e.dataTransfer.setData('text/tab-column-id', columnId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(bookmarkId);
  }, [columnId]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.dataTransfer.clearData();
    setDraggingId(null);
  }, []);

  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    const menu = menuRef.current;
    if (!menu) return;

    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'));
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < items.length - 1) {
          items[currentIndex + 1].focus();
        } else {
          items[0].focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          items[currentIndex - 1].focus();
        } else {
          items[items.length - 1].focus();
        }
        break;
      case 'Home':
        e.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Escape':
        e.preventDefault();
        setContextMenu(null);
        break;
      default:
        break;
    }
  }, []);

  useEffect(() => {
    if (!contextMenu?.visible) return;
    const timer = requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (menu) {
        const firstItem = menu.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)');
        firstItem?.focus();
      }
    });
    return () => cancelAnimationFrame(timer);
  }, [contextMenu?.visible]);

  if (openBookmarks.length === 0) {
    return (
      <div className={styles.emptyTabs}>
        <button
          className={styles.reopenBtn}
          onClick={handleMenuReopen}
          disabled={closedTabs.length === 0}
        >
          {closedTabs.length > 0 ? '↺ Reopen' : 'No open tabs'}
        </button>
      </div>
    );
  }

  const menuStyle: React.CSSProperties = {
    top: Math.min(contextMenu?.y ?? 0, window.innerHeight - 300),
  };
  if (dir === 'rtl') {
    menuStyle.right = window.innerWidth - (contextMenu?.x ?? 0);
  } else {
    menuStyle.left = Math.min(contextMenu?.x ?? 0, window.innerWidth - 200);
  }

  return (
    <>
      <div
        ref={tabBarRef}
        className={`${styles.tabBar} ${dir === 'rtl' ? styles.rtl : ''}`}
        role="tablist"
        aria-orientation="horizontal"
        aria-label={intl.formatMessage({ id: 'tabListLabel' })}
        dir={dir}
        tabIndex={0}
        onKeyDown={handleTabKeyDown}
      >
        {openBookmarks.map((bookmark) => {
          const isActive = bookmark.id === activeBookmarkId;
          const displayTitle = locale === 'ar'
            ? (bookmark.titleAr || bookmark.titleEn || bookmark.title)
            : (bookmark.titleEn || bookmark.titleAr || bookmark.title);
          return (
            <div
              key={bookmark.id}
              ref={(el) => {
                if (el) tabRefs.current.set(bookmark.id, el);
                else tabRefs.current.delete(bookmark.id);
              }}
              data-bookmark-id={bookmark.id}
              className={`${styles.tab} ${isActive ? styles.active : ''} ${draggingId === bookmark.id ? styles.dragging : ''}`}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabSelect(bookmark.id)}
              onContextMenu={(e) => handleContextMenu(e, bookmark.id)}
              draggable={!!columnId}
              onDragStart={(e) => handleDragStart(e, bookmark.id)}
              onDragEnd={handleDragEnd}
            >
              <span className={styles.tabTitle}>{truncateTitle(displayTitle)}</span>
              <button
                className={styles.closeBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  closeAndTrack(bookmark.id);
                }}
                aria-label={intl.formatMessage({ id: 'closeTabAria' }, { title: displayTitle })}
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
                  aria-label={intl.formatMessage({ id: 'openInNewColumnAria' }, { title: displayTitle })}
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
          className={`${styles.contextMenu} ${dir === 'rtl' ? styles.rtl : ''}`}
          style={menuStyle}
          role="menu"
          onKeyDown={handleMenuKeyDown}
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
