import React from 'react';
import { FormattedMessage } from 'react-intl';
import { Bookmark } from '../App';

interface BookmarkDetailProps {
  bookmark: Bookmark | null;
}

const BookmarkDetail: React.FC<BookmarkDetailProps> = ({ bookmark }) => {
  if (!bookmark) {
    return (
      <div className="bookmark-detail">
        <div className="detail-empty">
          <FormattedMessage id="selectBookmark" />
        </div>
      </div>
    );
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return <FormattedMessage id="high" />;
      case 'medium':
        return <FormattedMessage id="medium" />;
      case 'low':
        return <FormattedMessage id="low" />;
      default:
        return priority;
    }
  };

  return (
    <div className="bookmark-detail">
      <div className="detail-header">
        <h1 className="detail-title">{bookmark.title}</h1>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="detail-url"
        >
          {bookmark.url}
        </a>

        <div className="detail-meta">
          <span className="detail-topic">{bookmark.topic}</span>
          <span className="detail-topic">{bookmark.contentType}</span>
          <span className="detail-topic">{getPriorityLabel(bookmark.priority)}</span>
        </div>
      </div>

      <div className="detail-content">
        <p>{bookmark.content}</p>
      </div>

      <div className="detail-actions">
        <button
          className="action-button primary-button"
          onClick={() => window.open(bookmark.url, '_blank')}
        >
          <FormattedMessage id="openLink" />
        </button>
        <button className="action-button secondary-button">
          <FormattedMessage id="share" />
        </button>
      </div>
    </div>
  );
};

export default BookmarkDetail;
