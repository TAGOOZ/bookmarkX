import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import {
  Search, Download, Tag, FlaskConical, FlaskConicalOff, Settings,
  PanelRightOpen, PanelRightClose, Plus,
} from 'lucide-react';
import type { Bookmark } from '../types';
import TopicGroup from './TopicGroup';
import SearchOverlay from './SearchOverlay';
import { NotificationBell, NotificationPanel } from './notifications';
import type { NotificationItem } from './notifications';

interface TopicTreeNode {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: 'ai' | 'user';
  created_at: string;
  children: TopicTreeNode[];
  bookmark_count: number;
}

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

const EXPANDED_KEY = 'navPanel-expanded';
const EXPANDED_TOPICS_KEY = 'navPanel-expandedTopics';

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
  const intl = useIntl();
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(EXPANDED_KEY);
      return stored !== 'false';
    } catch {
      // localStorage may be unavailable
      return true;
    }
  });
  const [expandedTopics, setExpandedTopics] = useState<Record<string, boolean>>(
    () => {
      try {
        const stored = localStorage.getItem(EXPANDED_TOPICS_KEY);
        return stored ? JSON.parse(stored) : {};
      } catch {
        // localStorage may be unavailable
        return {};
      }
    },
  );
  const [topicTree, setTopicTree] = useState<TopicTreeNode[]>([]);
  const [userName, setUserName] = useState('');
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_KEY, String(isExpanded));
    } catch {
      // localStorage may be unavailable
    }
  }, [isExpanded]);

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_TOPICS_KEY, JSON.stringify(expandedTopics));
    } catch {
      // localStorage may be unavailable
    }
  }, [expandedTopics]);

  useEffect(() => {
    window.api.getTopicTree().then(setTopicTree).catch((err) => {
      console.warn('Failed to load topic tree:', err);
      setTopicTree([]);
    });
  }, []);

  useEffect(() => {
    window.api.getSettings().then((s) => setUserName(s.name || '')).catch((err) => {
      console.warn('Failed to load settings:', err);
    });
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notifs = await (window as any).api?.getNotifications?.() ?? [];
        setNotifications(notifs);
        const count = await (window as any).api?.getUnreadCount?.() ?? 0;
        setUnreadCount(count);
      } catch {
        // notifications not available yet
      }
    };
    loadNotifications();
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

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

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

  const handleCreateTopic = useCallback(async () => {
    if (!newTopicName.trim()) return;
    try {
      await (window as any).api?.createTopic?.(newTopicName.trim(), null);
      const tree = await (window as any).api?.getTopicTree?.();
      if (tree) setTopicTree(tree);
      setNewTopicName('');
      setShowCreateTopic(false);
    } catch (err) {
      console.error('Failed to create topic:', err);
    }
  }, [newTopicName]);

  const handleNotificationBellClick = useCallback(() => {
    setShowNotifications((prev) => !prev);
  }, []);

  const handleMarkNotificationRead = useCallback(async (id: string) => {
    try {
      await (window as any).api?.markNotificationRead?.(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: 1 } : n));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  }, []);

  const handleMarkAllNotificationsRead = useCallback(async () => {
    try {
      await (window as any).api?.markAllNotificationsRead?.();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('Failed to mark all notifications read:', err);
    }
  }, []);

  const handleDeleteNotification = useCallback(async (id: string) => {
    try {
      await (window as any).api?.deleteNotification?.(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((prev) => {
        const notif = notifications.find((n) => n.id === id);
        return notif?.read === 0 ? Math.max(0, prev - 1) : prev;
      });
    } catch (err) {
      console.warn('Failed to delete notification:', err);
    }
  }, [notifications]);

  const handleRenameTopic = useCallback(async (topicId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await (window as any).api?.renameTopic?.(topicId, newName.trim());
      const tree = await (window as any).api?.getTopicTree?.();
      if (tree) setTopicTree(tree);
    } catch (err) {
      console.error('Failed to rename topic:', err);
    }
  }, []);

  const handleDeleteTopic = useCallback(async (topicId: string) => {
    try {
      await (window as any).api?.deleteTopic?.(topicId);
      const tree = await (window as any).api?.getTopicTree?.();
      if (tree) setTopicTree(tree);
    } catch (err) {
      console.error('Failed to delete topic:', err);
    }
  }, []);

  const renderTopicNodes = (nodes: TopicTreeNode[], depth = 0) =>
    nodes.map((node) => {
      const bookmarksInTopic = bookmarkTopicMap.get(node.name) ?? [];
      const hasChildren = node.children.length > 0;
      const expanded = expandedTopics[node.name] ?? true;
      return (
        <TopicGroup
          key={node.id}
          topic={node.name}
          topicId={node.id}
          bookmarks={bookmarksInTopic}
          isExpanded={expanded}
          onToggle={handleToggleTopic}
          onSelectBookmark={onSelectBookmark}
          selectedBookmarkId={selectedBookmarkId}
          depth={depth}
          childCount={node.children.length}
          totalCount={node.bookmark_count}
          onRename={handleRenameTopic}
          onDelete={handleDeleteTopic}
        >
          {hasChildren && expanded && renderTopicNodes(node.children, depth + 1)}
        </TopicGroup>
      );
    });

  const hasTopics = topicTree.length > 0;
  const hasBookmarks = bookmarks.length > 0;

  const panelTabs = (
    <div className="nav-panel-tabs">
      <button
        className="nav-panel-tab"
        onClick={handleToggleExpand}
        title={isExpanded ? intl.formatMessage({ id: 'collapseNav' }) : intl.formatMessage({ id: 'expandNav' })}
      >
        {isExpanded ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
      </button>
      <button
        className="nav-panel-tab"
        onClick={handleOpenSearch}
        title={intl.formatMessage({ id: 'searchTooltip' })}
      >
        <Search size={18} />
      </button>
      {!mockMode && (
        <>
          <button
            className="nav-panel-tab"
            onClick={onFetchClick}
            title={intl.formatMessage({ id: 'fetchNowTooltip' })}
          >
            <Download size={18} />
          </button>
          <button
            className="nav-panel-tab"
            onClick={onClassifyClick}
            title={intl.formatMessage({ id: 'classifyNowTooltip' })}
          >
            <Tag size={18} />
          </button>
        </>
      )}
      <button
        className={`nav-panel-tab ${mockMode ? 'mock-mode-active' : ''}`}
        onClick={onToggleMockMode}
        title={mockMode ? intl.formatMessage({ id: 'stopMockModeTooltip' }) : intl.formatMessage({ id: 'mockModeTooltip' })}
      >
        {mockMode ? <FlaskConicalOff size={18} /> : <FlaskConical size={18} />}
      </button>
      <button
        className="nav-panel-tab"
        onClick={onSettingsClick}
        title={intl.formatMessage({ id: 'settingsTooltip' })}
      >
        <Settings size={18} />
      </button>
      <div style={{ position: 'relative' }}>
        <NotificationBell unreadCount={unreadCount} onClick={handleNotificationBellClick} />
        {showNotifications && (
          <NotificationPanel
            notifications={notifications}
            onMarkRead={handleMarkNotificationRead}
            onMarkAllRead={handleMarkAllNotificationsRead}
            onDelete={handleDeleteNotification}
            onClose={() => setShowNotifications(false)}
          />
        )}
      </div>
    </div>
  );

  const collapsedAvatar = userName && (
    <div className="nav-panel-collapsed-avatar" title={userName}>
      <div className="nav-panel-user-avatar">
        {userName.charAt(0).toUpperCase()}
      </div>
    </div>
  );

  return (
    <div
      className={`nav-panel ${isExpanded ? '' : 'nav-panel-collapsed'}`}
      onMouseEnter={() => { if (!isExpanded) setIsExpanded(true); }}
      onMouseLeave={() => { if (!isExpanded) setIsExpanded(false); }}
    >
      {!isExpanded && collapsedAvatar}
      {isExpanded && (
        <>
          {userName && (
            <div className="nav-panel-user">
              <div className="nav-panel-user-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="nav-panel-user-name">{userName}</span>
            </div>
          )}
          <div className="nav-panel-content">
            {hasTopics ? (
              renderTopicNodes(topicTree)
            ) : hasBookmarks ? (
              Array.from(bookmarkTopicMap.entries()).map(([topic, items]) => (
                <TopicGroup
                  key={topic}
                  topic={topic}
                  bookmarks={items}
                  isExpanded={expandedTopics[topic] ?? true}
                  onToggle={handleToggleTopic}
                  onSelectBookmark={onSelectBookmark}
                  selectedBookmarkId={selectedBookmarkId}
                  depth={0}
                />
              ))
            ) : (
              <div className="nav-panel-empty">
                {intl.formatMessage({ id: 'noBookmarks' })}
              </div>
            )}
            {showCreateTopic ? (
              <div className="topic-create-row">
                <input
                  className="topic-create-input"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateTopic();
                    if (e.key === 'Escape') { setShowCreateTopic(false); setNewTopicName(''); }
                  }}
                  placeholder={intl.formatMessage({ id: 'topicName' })}
                  autoFocus
                />
                <button className="topic-create-btn" onClick={handleCreateTopic}>
                  {intl.formatMessage({ id: 'createTopic' })}
                </button>
                <button
                  className="topic-create-cancel"
                  onClick={() => { setShowCreateTopic(false); setNewTopicName(''); }}
                >
                  {intl.formatMessage({ id: 'cancel' })}
                </button>
              </div>
            ) : (
              <button
                className="topic-add-btn"
                onClick={() => setShowCreateTopic(true)}
              >
                <Plus size={14} />
                {intl.formatMessage({ id: 'addTopic' })}
              </button>
            )}
          </div>
        </>
      )}
      {panelTabs}

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
