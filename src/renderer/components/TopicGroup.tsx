import React, { useState, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Bookmark } from '../App';

interface TopicGroupProps {
  topic: string;
  bookmarks: Bookmark[];
  maxVisible?: number;
  isExpanded: boolean;
  onToggle: (topic: string) => void;
  onSelectBookmark: (bookmark: Bookmark) => void;
  selectedBookmarkId: string | null;
}

const TopicGroup: React.FC<TopicGroupProps> = ({
  topic,
  bookmarks,
  maxVisible = 3,
  isExpanded,
  onToggle,
  onSelectBookmark,
  selectedBookmarkId,
}) => {
  const intl = useIntl();
  const [showAll, setShowAll] = useState(false);
  const visibleBookmarks = showAll ? bookmarks : bookmarks.slice(0, maxVisible);
  const hasMore = bookmarks.length > maxVisible;

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

  return (
    <div className="topic-group">
      <button
        className="topic-group-header"
        onClick={handleToggle}
        aria-expanded={isExpanded}
      >
        <span className="topic-group-chevron">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className="topic-group-name">{topic}</span>
        <span className="topic-group-count">{bookmarks.length}</span>
      </button>
      {isExpanded && (
        <div className="topic-group-items">
          {visibleBookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className={`topic-bookmark-item ${selectedBookmarkId === bookmark.id ? 'selected' : ''}`}
              role="button"
              tabIndex={0}
              aria-selected={selectedBookmarkId === bookmark.id}
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
          ))}
          {hasMore && (
            <button className="topic-show-more" onClick={handleShowMore}>
              {showAll
                ? intl.formatMessage({ id: 'showLess' })
                : intl.formatMessage({ id: 'showMore' }, { count: bookmarks.length - maxVisible })}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TopicGroup;
