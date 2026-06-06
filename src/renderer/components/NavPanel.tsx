import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, Download, Tag, FlaskConical, FlaskConicalOff, Settings } from 'lucide-react';
import { Bookmark } from '../App';
import TopicGroup from './TopicGroup';
import SearchOverlay from './SearchOverlay';

interface NavPanelProps {
  bookmarks: Bookmark[];
  onSettingsClick: () => void;
  onFetchClick: () => void;
  onClassifyClick: () => void;
  onSelectBookmark: (bookmark: Bookmark) => void;
  selectedBookmarkId: string | null;
  mockMode: boolean;
  onToggleMockMode: () => void;
}

const STORAGE_KEY = 'navPanel-expandedTopics';

const NavPanel: React.FC<NavPanelProps> = ({
  bookmarks,
  onSettingsClick,
  onFetchClick,
  onClassifyClick,
  onSelectBookmark,
  selectedBookmarkId,
  mockMode,
  onToggleMockMode,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(
    () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch {
        return {};
      }
    },
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedTopics));
    } catch {
      // localStorage not available
    }
  }, [expandedTopics]);

  const groupedBookmarks = useMemo(() => {
    const groups: Record<string, Bookmark[]> = {};
    bookmarks.forEach((bookmark) => {
      const topic = bookmark.topic || 'Uncategorized';
      if (!groups[topic]) {
        groups[topic] = [];
      }
      groups[topic].push(bookmark);
    });
    return groups;
  }, [bookmarks]);

  const topicNames = useMemo(() => Object.keys(groupedBookmarks), [groupedBookmarks]);

  const handleToggleTopic = useCallback((topic: string) => {
    setExpandedTopics((prev) => ({
      ...prev,
      [topic]: !prev[topic],
    }));
  }, []);

  const handleOpenSearch = useCallback(() => {
    setShowSearch(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setShowSearch(false);
  }, []);

  return (
    <div className="nav-panel">
      <div className="nav-panel-content">
        {topicNames.length === 0 ? (
          <div className="nav-panel-empty">
            لا توجد إشارات مرجعية
          </div>
        ) : (
          topicNames.map((topic) => (
            <TopicGroup
              key={topic}
              topic={topic}
              bookmarks={groupedBookmarks[topic]}
              isExpanded={expandedTopics[topic] ?? true}
              onToggle={handleToggleTopic}
              onSelectBookmark={onSelectBookmark}
              selectedBookmarkId={selectedBookmarkId}
            />
          ))
        )}
      </div>

      <div className="nav-panel-tabs">
        <button
          className="nav-panel-tab"
          onClick={handleOpenSearch}
          title="بحث"
        >
          <Search size={18} />
        </button>
        {!mockMode && (
          <>
            <button
              className="nav-panel-tab"
              onClick={onFetchClick}
              title="جلب الآن"
            >
              <Download size={18} />
            </button>
            <button
              className="nav-panel-tab"
              onClick={onClassifyClick}
              title="تصنيف الآن"
            >
              <Tag size={18} />
            </button>
          </>
        )}
        <button
          className={`nav-panel-tab ${mockMode ? 'mock-mode-active' : ''}`}
          onClick={onToggleMockMode}
          title={mockMode ? 'إيقاف وضع التجريب' : 'وضع التجريب'}
        >
          {mockMode ? <FlaskConicalOff size={18} /> : <FlaskConical size={18} />}
        </button>
        <button
          className="nav-panel-tab"
          onClick={onSettingsClick}
          title="الإعدادات"
        >
          <Settings size={18} />
        </button>
      </div>

      {showSearch && (
        <SearchOverlay
          bookmarks={bookmarks}
          onSelectBookmark={onSelectBookmark}
          onClose={handleCloseSearch}
        />
      )}
    </div>
  );
};

export default NavPanel;
