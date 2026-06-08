import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import type { Bookmark } from '../types';

interface ArticleSearchResult {
  bookmark_id: string;
  snippet: string;
  rank: number;
}

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
  const intl = useIntl();
  const [query, setQuery] = useState('');
  const [articleResults, setArticleResults] = useState<ArticleSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      bookmark.title.toLowerCase().includes(q) ||
      bookmark.url.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query || query.length < 2) {
      setArticleResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await (window as any).api?.searchArticles?.(query, 10);
        setArticleResults(results || []);
      } catch {
        setArticleResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const articleBookmarks = articleResults
    .map((result) => {
      const bookmark = bookmarks.find((b) => b.id === result.bookmark_id);
      return bookmark ? { bookmark, snippet: result.snippet } : null;
    })
    .filter(Boolean) as Array<{ bookmark: Bookmark; snippet: string }>;

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

  const hasTitleResults = filteredBookmarks.length > 0;
  const hasArticleResults = articleBookmarks.length > 0;

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
            placeholder={intl.formatMessage({ id: 'searchBookmarksPlaceholder' })}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="search-overlay-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="search-overlay-results">
          {!hasTitleResults && !hasArticleResults && !isSearching && (
            <div className="search-overlay-empty">
              {intl.formatMessage({ id: 'noResults' })}
            </div>
          )}

          {hasTitleResults && (
            <>
              <div className="search-overlay-section-title">
                {intl.formatMessage({ id: 'bookmarks' })}
              </div>
              {filteredBookmarks.slice(0, 5).map((bookmark) => (
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
              ))}
            </>
          )}

          {isSearching && (
            <div className="search-overlay-loading">
              {intl.formatMessage({ id: 'searchingArticles' })}
            </div>
          )}

          {hasArticleResults && (
            <>
              <div className="search-overlay-section-title">
                {intl.formatMessage({ id: 'articleContent' })}
              </div>
              {articleBookmarks.map(({ bookmark, snippet }) => (
                <div
                  key={`article-${bookmark.id}`}
                  className="search-overlay-item search-overlay-item-article"
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
                  <div
                    className="search-overlay-item-snippet"
                    dangerouslySetInnerHTML={{ __html: snippet }}
                  />
                  <div className="search-overlay-item-domain">
                    {getDomain(bookmark.url)}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
