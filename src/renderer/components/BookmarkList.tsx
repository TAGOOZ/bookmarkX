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

  const mockBookmarks: Bookmark[] = [
    {
      id: '1',
      title: 'Building a Personal Knowledge Management System',
      url: 'https://example.com/pkm-system',
      topic: 'تكنولوجيا',
      priority: 'high',
      contentType: 'article',
      content: 'A comprehensive guide to building your own PKM system using modern tools and methodologies.',
      createdAt: '2026-06-01T10:00:00Z',
    },
    {
      id: '2',
      title: 'The Future of AI in Software Development',
      url: 'https://example.com/ai-future-dev',
      topic: 'تكنولوجيا',
      priority: 'high',
      contentType: 'article',
      content: 'How artificial intelligence is transforming the way we write and maintain code.',
      createdAt: '2026-06-02T14:30:00Z',
    },
    {
      id: '3',
      title: 'Minimal Design Principles for Clean UIs',
      url: 'https://example.com/minimal-design',
      topic: 'تصميم',
      priority: 'medium',
      contentType: 'article',
      content: 'Exploring minimalism in digital design and how less can truly be more.',
      createdAt: '2026-06-03T09:15:00Z',
    },
    {
      id: '4',
      title: 'Understanding Venture Capital Funding Rounds',
      url: 'https://example.com/vc-funding',
      topic: 'أعمال',
      priority: 'medium',
      contentType: 'article',
      content: 'A breakdown of seed, Series A, B, C and what each round means for startups.',
      createdAt: '2026-06-03T11:00:00Z',
    },
    {
      id: '5',
      title: 'Quantum Computing Explained in 10 Minutes',
      url: 'https://example.com/quantum-101',
      topic: 'علوم',
      priority: 'low',
      contentType: 'video',
      content: 'A quick visual introduction to quantum computing concepts.',
      createdAt: '2026-06-04T16:45:00Z',
    },
    {
      id: '6',
      title: 'Thread: How to Build habits that stick',
      url: 'https://x.com/user/status/123456',
      topic: 'علوم',
      priority: 'high',
      contentType: 'link',
      content: 'A thread about neuroscience-backed strategies for building lasting habits.',
      createdAt: '2026-06-04T18:20:00Z',
    },
    {
      id: '7',
      title: 'React Server Components — A Deep Dive',
      url: 'https://example.com/rsc-deep-dive',
      topic: 'تكنولوجيا',
      priority: 'medium',
      contentType: 'article',
      content: 'Understanding React Server Components, how they work, and when to use them.',
      createdAt: '2026-06-05T08:00:00Z',
    },
    {
      id: '8',
      title: 'The Psychology of Color in UI Design',
      url: 'https://example.com/color-psychology',
      topic: 'تصميم',
      priority: 'low',
      contentType: 'image',
      content: 'How color choices affect user perception and behavior in digital interfaces.',
      createdAt: '2026-06-05T12:30:00Z',
    },
    {
      id: '9',
      title: 'Stripe CEO on Scaling a Fintech Company',
      url: 'https://example.com/stripe-scaling',
      topic: 'أعمال',
      priority: 'high',
      contentType: 'video',
      content: 'Patrick Collison shares insights on building and scaling Stripe.',
      createdAt: '2026-06-06T09:00:00Z',
    },
    {
      id: '10',
      title: 'New Breakthrough in CRISPR Gene Editing',
      url: 'https://example.com/crispr-2026',
      topic: 'علوم',
      priority: 'medium',
      contentType: 'article',
      content: 'Scientists achieve precision gene editing with zero off-target effects.',
      createdAt: '2026-06-06T14:15:00Z',
    },
  ];

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

      setBookmarks(mappedBookmarks.length > 0 ? mappedBookmarks : mockBookmarks);
    } catch {
      setBookmarks(mockBookmarks);
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
            aria-label="بحث في المفضلات"
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
            role="button"
            tabIndex={0}
            onClick={() => onBookmarkSelect(bookmark)}
            onKeyDown={(e) => e.key === 'Enter' && onBookmarkSelect(bookmark)}
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
