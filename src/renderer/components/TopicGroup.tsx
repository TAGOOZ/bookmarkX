import React, { useState, useCallback, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronDown, ChevronRight, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Bookmark } from '../types';

const VIRTUALIZE_THRESHOLD = 50;
const ITEM_HEIGHT = 56;
const MAX_VIRTUAL_HEIGHT = 400;

interface TopicGroupProps {
  topic: string;
  topicId?: string;
  bookmarks: Bookmark[];
  maxVisible?: number;
  isExpanded: boolean;
  onToggle: (topic: string) => void;
  onSelectBookmark: (bookmark: Bookmark) => void;
  selectedBookmarkId: string | null;
  depth?: number;
  childCount?: number;
  totalCount?: number;
  children?: React.ReactNode;
  onRename?: (topicId: string, newName: string) => void;
  onDelete?: (topicId: string) => void;
  onMoveBookmark?: (bookmarkId: string, targetTopicId: string | null) => void;
  isDragOver?: boolean;
}

const TopicGroup: React.FC<TopicGroupProps> = ({
  topic,
  topicId,
  bookmarks,
  maxVisible = 3,
  isExpanded,
  onToggle,
  onSelectBookmark,
  selectedBookmarkId,
  depth = 0,
  totalCount,
  children,
  onRename,
  onDelete,
  onMoveBookmark,
  isDragOver,
}) => {
  const intl = useIntl();
  const [showAll, setShowAll] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(topic);
  const [localDragOver, setLocalDragOver] = useState(false);
  const hasMore = bookmarks.length > maxVisible;
  const shouldVirtualize = bookmarks.length > VIRTUALIZE_THRESHOLD;
  const visibleBookmarks = showAll ? bookmarks : bookmarks.slice(0, maxVisible);
  const displayCount = totalCount ?? bookmarks.length;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: shouldVirtualize && showAll ? bookmarks.length : 0,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 5,
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'var(--priority-high)';
      case 'medium':
        return 'var(--priority-medium)';
      case 'low':
        return 'var(--priority-low)';
      default:
        return 'var(--text-muted)';
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const handleToggle = useCallback(() => {
    onToggle(topic);
  }, [topic, onToggle]);

  const handleShowMore = useCallback(() => {
    setShowAll((prev) => !prev);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu((prev) => !prev);
  }, []);

  const handleRename = useCallback(() => {
    if (topicId && onRename && renameValue.trim() && renameValue.trim() !== topic) {
      onRename(topicId, renameValue.trim());
    }
    setIsRenaming(false);
    setShowContextMenu(false);
  }, [topicId, onRename, renameValue, topic]);

  const handleDelete = useCallback(() => {
    if (topicId && onDelete) {
      onDelete(topicId);
    }
    setShowContextMenu(false);
  }, [topicId, onDelete]);

  const handleDragStart = useCallback((e: React.DragEvent, bookmark: Bookmark) => {
    e.dataTransfer.setData('application/bookmark-id', bookmark.id);
    e.dataTransfer.setData('text/plain', bookmark.id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setLocalDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setLocalDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setLocalDragOver(false);
    const draggedBookmarkId = e.dataTransfer.getData('application/bookmark-id');
    if (draggedBookmarkId && onMoveBookmark) {
      onMoveBookmark(draggedBookmarkId, topicId || null);
    }
  }, [topicId, onMoveBookmark]);

  return (
    <div
      className={`topic-group ${isDragOver || localDragOver ? 'topic-group-drag-over' : ''}`}
      style={{ paddingInlineStart: depth > 0 ? `${depth * 12}px` : undefined }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="topic-group-header-row">
        <button
          className="topic-group-header"
          onClick={handleToggle}
          aria-expanded={isExpanded}
        >
          <span className="topic-group-chevron">
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          {isRenaming ? (
            <input
              className="topic-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') { setIsRenaming(false); setRenameValue(topic); }
              }}
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="topic-group-name">{topic}</span>
          )}
          <span className="topic-group-count">{displayCount}</span>
        </button>
        {topicId && (onRename || onDelete) && (
          <div className="topic-context-wrapper">
            <button
              className="topic-context-btn"
              onClick={handleContextMenu}
              aria-label={intl.formatMessage({ id: 'settings' })}
              aria-expanded={showContextMenu}
              aria-haspopup="menu"
            >
              <MoreHorizontal size={14} />
            </button>
            {showContextMenu && (
              <div className="topic-context-menu" role="menu" onKeyDown={(e) => { if (e.key === 'Escape') setShowContextMenu(false); }}>
                {onRename && (
                  <button
                    className="topic-context-item"
                    onClick={() => { setIsRenaming(true); setShowContextMenu(false); }}
                  >
                    <Pencil size={12} />
                    {intl.formatMessage({ id: 'renameTopic' })}
                  </button>
                )}
                {onDelete && (
                  <button
                    className="topic-context-item topic-context-danger"
                    onClick={handleDelete}
                  >
                    <Trash2 size={12} />
                    {intl.formatMessage({ id: 'deleteTopic' })}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {isExpanded && (
        <div className="topic-group-items">
          {shouldVirtualize && showAll ? (
            <div
              ref={scrollContainerRef}
              className="topic-group-virtual-list"
              style={{ height: Math.min(bookmarks.length * ITEM_HEIGHT, MAX_VIRTUAL_HEIGHT), overflow: 'auto' }}
            >
              <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const bookmark = bookmarks[virtualRow.index];
                  return (
                    <div
                      key={bookmark.id}
                      className={`topic-bookmark-item ${selectedBookmarkId === bookmark.id ? 'selected' : ''}`}
                      role="button"
                      tabIndex={0}
                      aria-selected={selectedBookmarkId === bookmark.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, bookmark)}
                      onClick={() => onSelectBookmark(bookmark)}
                      onKeyDown={(e) =>
                        (e.key === 'Enter' || e.key === ' ') &&
                        (e.preventDefault(), onSelectBookmark(bookmark))
                      }
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: virtualRow.size,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <div className="topic-bookmark-title">{bookmark.title}</div>
                      <div className="topic-bookmark-meta">
                        <span className="topic-bookmark-domain">
                          {getDomain(bookmark.url)}
                        </span>
                        <span
                          className="topic-bookmark-priority"
                          style={{ backgroundColor: getPriorityColor(bookmark.priority) }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            visibleBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className={`topic-bookmark-item ${selectedBookmarkId === bookmark.id ? 'selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-selected={selectedBookmarkId === bookmark.id}
                draggable
                onDragStart={(e) => handleDragStart(e, bookmark)}
                onClick={() => onSelectBookmark(bookmark)}
                onKeyDown={(e) =>
                  (e.key === 'Enter' || e.key === ' ') &&
                  (e.preventDefault(), onSelectBookmark(bookmark))
                }
              >
                <div className="topic-bookmark-title">{bookmark.title}</div>
                <div className="topic-bookmark-meta">
                  <span className="topic-bookmark-domain">
                    {getDomain(bookmark.url)}
                  </span>
                  <span
                    className="topic-bookmark-priority"
                    style={{ backgroundColor: getPriorityColor(bookmark.priority) }}
                  />
                </div>
              </div>
            ))
          )}
          {hasMore && (
            <button className="topic-show-more" onClick={handleShowMore}>
              {showAll
                ? intl.formatMessage({ id: 'showLess' })
                : intl.formatMessage({ id: 'showMore' }, { count: bookmarks.length - maxVisible })}
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
};

export default TopicGroup;
