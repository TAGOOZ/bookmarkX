import React from 'react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  url: string;
  topic: string;
  priority: 'high' | 'medium' | 'low';
  contentType: string;
  readingTime?: number;
  createdAt?: string;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  url,
  topic,
  priority,
  contentType,
  readingTime,
  createdAt,
}) => {
  if (!title) return null;

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.url}
      >
        {url}
      </a>
      <div className={styles.meta}>
        <span className={styles.metaItem}>{topic}</span>
        <span className={styles.metaDot}>·</span>
        <span className={styles.metaItem}>{contentType}</span>
        <span className={styles.metaDot}>·</span>
        <span className={`${styles.metaItem} ${styles[priority]}`}>
          {priority}
        </span>
        {readingTime && (
          <>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaItem}>{readingTime} min read</span>
          </>
        )}
        {createdAt && (
          <>
            <span className={styles.metaDot}>·</span>
            <span className={styles.metaItem}>
              updated {getRelativeTime(createdAt)}
            </span>
          </>
        )}
      </div>
    </header>
  );
};

export default PageHeader;
