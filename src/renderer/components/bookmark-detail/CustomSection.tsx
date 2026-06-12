import React, { useState, useCallback } from 'react';
import { useIntl } from 'react-intl';
import styles from './CustomSection.module.css';

export interface CustomSectionData {
  id: string;
  title: string;
  content: string;
  bookmark_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CustomSectionProps {
  section: CustomSectionData;
  onUpdate?: (id: string, data: { title?: string; content?: string }) => void;
  onDelete?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

const CustomSection: React.FC<CustomSectionProps> = ({
  section,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) => {
  const intl = useIntl();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [content, setContent] = useState(section.content);

  const handleSave = useCallback(() => {
    onUpdate?.(section.id, { title, content });
    setIsEditing(false);
  }, [section.id, title, content, onUpdate]);

  const handleCancel = useCallback(() => {
    setTitle(section.title);
    setContent(section.content);
    setIsEditing(false);
  }, [section.title, section.content]);

  return (
    <div className={styles.section} data-section-id={`custom-${section.id}`}>
      <div className={styles.header}>
        {isEditing ? (
          <input
            className={styles.titleInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={intl.formatMessage({ id: 'sectionTitle' })}
            aria-label={intl.formatMessage({ id: 'sectionTitle' })}
          />
        ) : (
          <span className={styles.title}>{section.title}</span>
        )}
        <div className={styles.actions}>
          {isEditing ? (
            <>
              <button
                className={styles.actionBtn}
                onClick={handleSave}
                aria-label={intl.formatMessage({ id: 'save' })}
              >
                ✓
              </button>
              <button
                className={styles.actionBtn}
                onClick={handleCancel}
                aria-label={intl.formatMessage({ id: 'cancel' })}
              >
                ✕
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.actionBtn}
                onClick={() => setIsEditing(true)}
                aria-label={intl.formatMessage({ id: 'editSection' })}
                title={intl.formatMessage({ id: 'editSection' })}
              >
                ✎
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => onMoveUp?.(section.id)}
                aria-label={intl.formatMessage({ id: 'moveSectionUp' })}
                title={intl.formatMessage({ id: 'moveSectionUp' })}
              >
                ↑
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => onMoveDown?.(section.id)}
                aria-label={intl.formatMessage({ id: 'moveSectionDown' })}
                title={intl.formatMessage({ id: 'moveSectionDown' })}
              >
                ↓
              </button>
              <button
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                onClick={() => onDelete?.(section.id)}
                aria-label={intl.formatMessage({ id: 'deleteSection' })}
                title={intl.formatMessage({ id: 'deleteSection' })}
              >
                🗑
              </button>
            </>
          )}
        </div>
      </div>
      <div className={styles.content}>
        {isEditing ? (
          <textarea
            className={styles.contentInput}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={intl.formatMessage({ id: 'sectionContent' })}
            aria-label={intl.formatMessage({ id: 'sectionContent' })}
          />
        ) : (
          <div className={styles.contentDisplay}>
            {section.content || (
              <span className={styles.placeholder}>
                {intl.formatMessage({ id: 'emptySection' })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomSection;
