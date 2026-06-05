import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Bookmark, FilterState } from '../App';

interface BookmarkListProps {
  selectedBookmark: Bookmark | null;
  onBookmarkSelect: (bookmark: Bookmark) => void;
  filters: FilterState;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const mockBookmarks: Bookmark[] = [
  {
    id: '1',
    title: 'مقدمة في تعلم الآلة',
    url: 'https://example.com/ml-intro',
    topic: 'technology',
    priority: 'high',
    contentType: 'article',
    content: 'مقال شامل عن أساسيات تعلم الآلة والذكاء الاصطناعي.',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    title: 'أساسيات التصميم UI/UX',
    url: 'https://example.com/design-basics',
    topic: 'design',
    priority: 'medium',
    contentType: 'video',
    content: 'دورة فيديو عن أساسيات تصميم واجهات المستخدم وتجربة المستخدم.',
    createdAt: '2024-01-10',
  },
  {
    id: '3',
    title: 'ريادة الأعمال في 2024',
    url: 'https://example.com/entrepreneurship',
    topic: 'business',
    priority: 'low',
    contentType: 'article',
    content: 'مقال عن أهم اتجاهات ريادة الأعمال في عام 2024.',
    createdAt: '2024-01-05',
  },
];

const BookmarkList: React.FC<BookmarkListProps> = ({
  selectedBookmark,
  onBookmarkSelect,
  filters,
  searchQuery,
  onSearchChange,
}) => {
  const filteredBookmarks = mockBookmarks.filter((bookmark) => {
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
