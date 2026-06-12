import React from 'react';
import { FormattedMessage } from 'react-intl';
import styles from './PageHeader.module.css';

const ICONS: Record<string, string> = {
  topic: '📁',
  type: '📄',
  priority: '⚡',
  time: '⏱️',
  calendar: '📅',
  link: '🔗',
};

interface PageHeaderProps {
  title: string;
  url?: string;
  topic?: string;
  contentType?: string;
  priority?: string;
  readingTime?: number;
  createdAt?: string;
  onOpenUrl?: (url: string) => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  url,
  topic,
  contentType,
  priority,
  readingTime,
  createdAt,
  onOpenUrl,
}) => {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {url && (
        <button
          className={styles.url}
          onClick={() => onOpenUrl?.(url)}
          title={url}
        >
          <span className={styles.urlIcon}>{ICONS.link}</span>
          <span className={styles.urlText}>{url}</span>
        </button>
      )}
      <div className={styles.meta}>
        {topic && (
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}>{ICONS.topic}</span>
            {topic}
          </span>
        )}
        {contentType && (
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}>{ICONS.type}</span>
            {contentType}
          </span>
        )}
        {priority && (
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}>{ICONS.priority}</span>
            {priority.toUpperCase()}
          </span>
        )}
        {readingTime && (
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}>{ICONS.time}</span>
            <FormattedMessage id="minRead" values={{ 0: readingTime }} />
          </span>
        )}
        {createdAt && (
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}>{ICONS.calendar}</span>
            {new Date(createdAt).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
