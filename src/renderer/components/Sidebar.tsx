import React from 'react';
import { FormattedMessage } from 'react-intl';
import { FilterState } from '../App';

interface SidebarProps {
  onSettingsClick: () => void;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onFetchClick: () => void;
  onClassifyClick: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  onSettingsClick,
  filters,
  onFilterChange,
  onFetchClick,
  onClassifyClick,
}) => {
  const priorities = [
    { value: '', label: 'all' },
    { value: 'high', label: 'high' },
    { value: 'medium', label: 'medium' },
    { value: 'low', label: 'low' },
  ];

  const topics = [
    { value: '', label: 'allTopics' },
    { value: 'technology', label: 'تكنولوجيا' },
    { value: 'design', label: 'تصميم' },
    { value: 'business', label: 'أعمال' },
    { value: 'science', label: 'علوم' },
  ];

  const contentTypes = [
    { value: '', label: 'allTypes' },
    { value: 'article', label: 'مقال' },
    { value: 'video', label: 'فيديو' },
    { value: 'image', label: 'صورة' },
    { value: 'link', label: 'رابط' },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <FormattedMessage id="appName" />
      </div>

      <nav className="sidebar-nav">
        <div className="nav-item active">
          <FormattedMessage id="bookmarks" />
        </div>
        <div className="nav-item" onClick={onFetchClick}>
          <FormattedMessage id="fetchNow" />
        </div>
        <div className="nav-item" onClick={onClassifyClick}>
          <FormattedMessage id="classifyNow" />
        </div>
        <div className="nav-item" onClick={onSettingsClick}>
          <FormattedMessage id="settings" />
        </div>
      </nav>

      <div className="filter-section">
        <div className="filter-title">
          <FormattedMessage id="priority" />
        </div>
        {priorities.map((p) => (
          <div
            key={p.value}
            className={`filter-item ${filters.priority === p.value ? 'active' : ''}`}
            onClick={() => onFilterChange({ ...filters, priority: p.value })}
          >
            <FormattedMessage id={p.label} />
          </div>
        ))}
      </div>

      <div className="filter-section">
        <div className="filter-title">
          <FormattedMessage id="topics" />
        </div>
        {topics.map((t) => (
          <div
            key={t.value}
            className={`filter-item ${filters.topic === t.value ? 'active' : ''}`}
            onClick={() => onFilterChange({ ...filters, topic: t.value })}
          >
            <FormattedMessage id={t.label} />
          </div>
        ))}
      </div>

      <div className="filter-section">
        <div className="filter-title">
          <FormattedMessage id="contentTypes" />
        </div>
        {contentTypes.map((ct) => (
          <div
            key={ct.value}
            className={`filter-item ${filters.contentType === ct.value ? 'active' : ''}`}
            onClick={() => onFilterChange({ ...filters, contentType: ct.value })}
          >
            <FormattedMessage id={ct.label} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
