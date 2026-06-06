import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bookmark } from '../App';

interface SearchOverlayProps {
  bookmarks: Bookmark[];
  onSelectBookmark: (bookmark: Bookmark) => void;
  onClose: () => void;
}

const SearchOverlay: React.FC<SearchOverlayProps> = ({
  bookmarks,
  onSelectBookmark,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      bookmark.title.toLowerCase().includes(q) ||
      bookmark.url.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleSelect = useCallback(
    (bookmark: Bookmark) => {
      onSelectBookmark(bookmark);
      onClose();
    },
    [onSelectBookmark, onClose],
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div
      className="search-overlay"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Search bookmarks"
    >
      <div className="search-overlay-content">
        <div className="search-overlay-header">
          <input
            ref={inputRef}
            type="text"
            className="search-overlay-input"
            placeholder="بحث في الإشارات المرجعية..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="search-overlay-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="search-overlay-results">
          {filteredBookmarks.length === 0 ? (
            <div className="search-overlay-empty">
              لا توجد نتائج
            </div>
          ) : (
            filteredBookmarks.map((bookmark) => (
              <div
                key={bookmark.id}
                className="search-overlay-item"
                role="button"
                tabIndex={0}
                onClick={() => handleSelect(bookmark)}
                onKeyDown={(e) =>
                  (e.key === 'Enter' || e.key === ' ') &&
                  (e.preventDefault(), handleSelect(bookmark))
                }
              >
                <div className="search-overlay-item-title">
                  {bookmark.title}
                </div>
                <div className="search-overlay-item-domain">
                  {getDomain(bookmark.url)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
