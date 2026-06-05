import React, { useState, useEffect } from 'react';
import { FormattedMessage } from 'react-intl';
import { Bookmark, FilterState } from '../App';

interface BookmarkListProps {
  selectedBookmark: Bookmark | null;
  onBookmarkSelect: (bookmark: Bookmark) => void;
  filters: FilterState;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  refreshKey?: number;
}

const BookmarkList: React.FC<BookmarkListProps> = ({
  selectedBookmark,
  onBookmarkSelect,
  filters,
  searchQuery,
  onSearchChange,
  refreshKey = 0,
}) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dbBookmarks, classifications] = await Promise.all([
        window.api.getBookmarks(),
        window.api.getClassifications(),
      ]);

      const classificationMap = new Map(
        classifications.map(c => [c.bookmark_id, c])
      );

      const mappedBookmarks: Bookmark[] = dbBookmarks.map(dbBookmark => {
        const classification = classificationMap.get(dbBookmark.id);
        return {
          id: dbBookmark.id,
          title: dbBookmark.title || dbBookmark.tweet_text || 'Untitled',
          url: dbBookmark.url,
          topic: classification?.priority || 'medium',
          priority: (classification?.priority as 'high' | 'medium' | 'low') || 'medium',
          contentType: dbBookmark.content_type,
          content: dbBookmark.tweet_text || '',
          createdAt: dbBookmark.fetched_at,
        };
      });

      setBookmarks(mappedBookmarks);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, [refreshKey]);

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    if (filters.priority && bookmark.priority !== filters.priority) {
      return false;
    }
    if (filters.topic && bookmark.topic !== filters.topic) {
      return false;
    }
    if (filters.contentType && bookmark.contentType !== filters.contentType) {
      return false;
    }
    if (
      searchQuery &&
      !bookmark.title.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      case 'low':
        return 'priority-low';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="bookmark-list">
        <div className="list-header">
          <FormattedMessage id="bookmarks" />
          <input
            type="text"
            className="search-input"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <div className="empty-title">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bookmark-list">
        <div className="list-header">
          <FormattedMessage id="bookmarks" />
          <input
            type="text"
            className="search-input"
            placeholder="بحث..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="empty-state">
          <div className="empty-icon">⚠️</div>
          <div className="empty-title">Failed to load bookmarks</div>
          <div className="empty-description">{error}</div>
          <button className="action-button primary-button" onClick={fetchBookmarks}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bookmark-list">
      <div className="list-header">
        <FormattedMessage id="bookmarks" />
        <input
          type="text"
          className="search-input"
          placeholder="بحث..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {filteredBookmarks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <div className="empty-title">
            <FormattedMessage id="noBookmarks" />
          </div>
          <div className="empty-description">
            <FormattedMessage id="noBookmarksDescription" />
          </div>
        </div>
      ) : (
        filteredBookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            className={`bookmark-item ${
              selectedBookmark?.id === bookmark.id ? 'selected' : ''
            }`}
            onClick={() => onBookmarkSelect(bookmark)}
          >
            <div className="bookmark-title">{bookmark.title}</div>
            <div className="bookmark-url">{bookmark.url}</div>
            <div className="bookmark-meta">
              <span className={`priority-badge ${getPriorityClass(bookmark.priority)}`}>
                {bookmark.priority === 'high' && <FormattedMessage id="high" />}
                {bookmark.priority === 'medium' && <FormattedMessage id="medium" />}
                {bookmark.priority === 'low' && <FormattedMessage id="low" />}
              </span>
              <span>{bookmark.topic}</span>
              <span>{bookmark.contentType}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default BookmarkList;
