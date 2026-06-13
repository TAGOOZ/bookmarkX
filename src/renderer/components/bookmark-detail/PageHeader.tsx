import React, { useState, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Folder, FileText, Zap, Clock, Calendar, Link } from 'lucide-react';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  url?: string;
  topic?: string;
  contentType?: string;
  priority?: string;
  readingTime?: number;
  createdAt?: string;
  hashtags?: Array<{ id: string; name: string }>;
  onOpenUrl?: (url: string) => void;
  onAddHashtag?: (name: string) => void;
  onRemoveHashtag?: (id: string) => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  url,
  topic,
  contentType,
  priority,
  readingTime,
  createdAt,
  hashtags = [],
  onOpenUrl,
  onAddHashtag,
  onRemoveHashtag,
}) => {
  const intl = useIntl();
  const [newHashtag, setNewHashtag] = useState('');

  const handleAddHashtag = useCallback(() => {
    const trimmed = newHashtag.trim();
    if (trimmed && onAddHashtag) {
      onAddHashtag(trimmed);
      setNewHashtag('');
    }
  }, [newHashtag, onAddHashtag]);

  const priorityClass = priority === 'high' ? styles.priorityHigh
    : priority === 'medium' ? styles.priorityMedium
    : priority === 'low' ? styles.priorityLow
    : '';

  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {url && (
        <button
          className={styles.url}
          onClick={() => onOpenUrl?.(url)}
          title={url}
        >
          <span className={styles.urlIcon}><Link size={14} /></span>
          <span className={styles.urlText}>{url}</span>
        </button>
      )}
      <div className={styles.meta}>
        {topic && (
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}><Folder size={14} /></span>
            {topic}
          </span>
        )}
        {contentType && (
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}><FileText size={14} /></span>
            {contentType}
          </span>
        )}
        {priority && (
          <span className={`${styles.metaItem} ${priorityClass}`}>
            <span className={styles.metaIcon}><Zap size={14} /></span>
            {priority.toUpperCase()}
          </span>
        )}
        {readingTime != null && (
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}><Clock size={14} /></span>
            <FormattedMessage id="minRead" values={{ 0: readingTime }} />
          </span>
        )}
        {createdAt && (
          <span className={styles.metaItem}>
            <span className={styles.metaIcon}><Calendar size={14} /></span>
            {new Date(createdAt).toLocaleDateString()}
          </span>
        )}
      </div>
      {(hashtags.length > 0 || onAddHashtag) && (
        <div className={styles.hashtagRow}>
          <div className={styles.hashtagList}>
            {hashtags.map((tag) => (
              <span key={tag.id} className={styles.hashtagChip}>
                #{tag.name}
                {onRemoveHashtag && (
                  <button
                    className={styles.hashtagRemove}
                    onClick={() => onRemoveHashtag(tag.id)}
                    aria-label={`Remove ${tag.name}`}
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
          {onAddHashtag && (
            <div className={styles.hashtagAdd}>
              <input
                className={styles.hashtagInput}
                value={newHashtag}
                onChange={(e) => setNewHashtag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddHashtag();
                }}
                placeholder="#"
                aria-label={intl.formatMessage({ id: 'addHashtag' })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
