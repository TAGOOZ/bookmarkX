import React, { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import type { Bookmark } from '../types';
import TopicGroup from './TopicGroup';
import SearchOverlay from './SearchOverlay';
import { useUIStore } from '../stores/uiStore';
import { useNotifications } from './nav-panel/hooks/useNotifications';
import { useTopicTree } from './nav-panel/hooks/useTopicTree';
import type { TopicTreeNode } from './nav-panel/hooks/useTopicTree';
import NavPanelTabs from './nav-panel/NavPanelTabs';
import NavPanelUser from './nav-panel/NavPanelUser';
import TopicCreateRow from './nav-panel/TopicCreateRow';
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
const NavPanel: React.FC<NavPanelProps> = ({
  bookmarks, onSettingsClick, onFetchClick, onClassifyClick,
  onSelectBookmark, selectedBookmarkId, mockMode, onToggleMockMode,
}) => {
  const intl = useIntl();
  const [showSearch, setShowSearch] = useState(false);
  const [userName, setUserName] = useState('');
  const isExpanded = useUIStore((s) => s.navExpanded);
  const setNavExpanded = useUIStore((s) => s.setNavExpanded);
  const expandedTopics = useUIStore((s) => s.expandedTopics);
  const toggleTopic = useUIStore((s) => s.toggleTopic);
  const { topicTree, refresh: refreshTopicTree, createTopic, renameTopic, deleteTopic, moveBookmark } = useTopicTree();
  const { notifications, unreadCount, showNotifications, setShowNotifications, markRead, markAllRead, deleteNotification } = useNotifications();
  useEffect(() => {
    window.api.getSettings().then((s) => setUserName(s.name || '')).catch(() => {});
  }, []);
  const bookmarkTopicMap = useMemo(() => {
    const map = new Map<string, Bookmark[]>();
    bookmarks.forEach((b) => {
      const key = b.topic || 'Uncategorized';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    });
    return map;
  }, [bookmarks]);
  const renderTopicNodes = (nodes: TopicTreeNode[], depth = 0) =>
    nodes.map((node) => {
      const bookmarksInTopic = bookmarkTopicMap.get(node.name) ?? [];
      const hasChildren = node.children.length > 0;
      const expanded = expandedTopics[node.name] ?? true;
      return (
        <TopicGroup
          key={node.id} topic={node.name} topicId={node.id}
          bookmarks={bookmarksInTopic} isExpanded={expanded}
          onToggle={toggleTopic} onSelectBookmark={onSelectBookmark}
          selectedBookmarkId={selectedBookmarkId} depth={depth}
          childCount={node.children.length} totalCount={node.bookmark_count}
          onRename={renameTopic} onDelete={deleteTopic} onMoveBookmark={moveBookmark}
        >
          {hasChildren && expanded && renderTopicNodes(node.children, depth + 1)}
        </TopicGroup>
      );
    });
  return (
    <div
      className={`nav-panel ${isExpanded ? '' : 'nav-panel-collapsed'}`}
      onMouseEnter={() => { if (!isExpanded) setNavExpanded(true); }}
      onMouseLeave={() => { if (!isExpanded) setNavExpanded(false); }}
    >
      {!isExpanded && <NavPanelUser userName={userName} isExpanded={false} />}
      {isExpanded && (
        <>
          <NavPanelUser userName={userName} isExpanded={true} />
          <div className="nav-panel-content">
            {topicTree.length > 0 ? (
              renderTopicNodes(topicTree)
            ) : bookmarks.length > 0 ? (
              Array.from(bookmarkTopicMap.entries()).map(([topic, items]) => (
                <TopicGroup
                  key={topic} topic={topic} bookmarks={items}
                  isExpanded={expandedTopics[topic] ?? true}
                  onToggle={toggleTopic} onSelectBookmark={onSelectBookmark}
                  selectedBookmarkId={selectedBookmarkId} depth={0}
                  onMoveBookmark={moveBookmark}
                />
              ))
            ) : (
              <div className="nav-panel-empty">{intl.formatMessage({ id: 'noBookmarks' })}</div>
            )}
            <TopicCreateRow onCreate={createTopic} />
          </div>
        </>
      )}
      <NavPanelTabs
        isExpanded={isExpanded}
        onToggleExpand={() => setNavExpanded((prev) => !prev)}
        onOpenSearch={() => setShowSearch(true)}
        onRefreshTopicTree={refreshTopicTree}
        onFetchClick={onFetchClick} onClassifyClick={onClassifyClick}
        mockMode={mockMode} onToggleMockMode={onToggleMockMode}
        onSettingsClick={onSettingsClick}
        unreadCount={unreadCount} showNotifications={showNotifications}
        onToggleNotifications={() => setShowNotifications((prev) => !prev)}
        onCloseNotifications={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkNotificationRead={markRead} onMarkAllNotificationsRead={markAllRead}
        onDeleteNotification={deleteNotification}
      />
      {showSearch && (
        <SearchOverlay bookmarks={bookmarks} onSelectBookmark={onSelectBookmark} onClose={() => setShowSearch(false)} />
      )}
    </div>
  );
};
export default NavPanel;
