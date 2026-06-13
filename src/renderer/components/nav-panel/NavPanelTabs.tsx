import React from 'react';
import { useIntl } from 'react-intl';
import {
  Search, Download, Tag, FlaskConical, FlaskConicalOff, Settings,
  PanelRightOpen, PanelRightClose,
} from 'lucide-react';
import ImportProgress from '../ImportProgress';
import { NotificationBell, NotificationPanel } from '../notifications';
import type { NotificationItem } from '../notifications';

interface NavPanelTabsProps {
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenSearch: () => void;
  onRefreshTopicTree: () => void;
  onFetchClick: () => void;
  onClassifyClick: () => void;
  mockMode: boolean;
  onToggleMockMode: () => void;
  onSettingsClick: () => void;
  unreadCount: number;
  showNotifications: boolean;
  onToggleNotifications: () => void;
  onCloseNotifications: () => void;
  notifications: NotificationItem[];
  onMarkNotificationRead: (id: string) => void;
  onMarkAllNotificationsRead: () => void;
  onDeleteNotification: (id: string) => void;
}

const NavPanelTabs: React.FC<NavPanelTabsProps> = ({
  isExpanded,
  onToggleExpand,
  onOpenSearch,
  onRefreshTopicTree,
  onFetchClick,
  onClassifyClick,
  mockMode,
  onToggleMockMode,
  onSettingsClick,
  unreadCount,
  showNotifications,
  onToggleNotifications,
  onCloseNotifications,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onDeleteNotification,
}) => {
  const intl = useIntl();

  return (
    <div className="nav-panel-tabs">
      <button
        className="nav-panel-tab"
        onClick={onToggleExpand}
        title={isExpanded ? intl.formatMessage({ id: 'collapseNav' }) : intl.formatMessage({ id: 'expandNav' })}
      >
        {isExpanded ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
      </button>
      <button
        className="nav-panel-tab"
        onClick={onOpenSearch}
        title={intl.formatMessage({ id: 'searchTooltip' })}
      >
        <Search size={18} />
      </button>
      {!mockMode && (
        <>
          <ImportProgress onRefresh={onRefreshTopicTree} />
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
        <NotificationBell unreadCount={unreadCount} onClick={onToggleNotifications} />
        {showNotifications && (
          <NotificationPanel
            notifications={notifications}
            onMarkRead={onMarkNotificationRead}
            onMarkAllRead={onMarkAllNotificationsRead}
            onDelete={onDeleteNotification}
            onClose={onCloseNotifications}
          />
        )}
      </div>
    </div>
  );
};

export default NavPanelTabs;
