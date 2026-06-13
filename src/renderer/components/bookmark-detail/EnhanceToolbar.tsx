import React, { useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import styles from './EnhanceToolbar.module.css';

interface EnhanceToolbarProps {
  selectedText: string;
  position: { top: number; left: number } | null;
  onEnhance: (text: string) => void;
  onHighlight: (text: string) => void;
  onReference: (text: string) => void;
  onClose: () => void;
}

const MAX_PREVIEW = 40;

const EnhanceToolbar: React.FC<EnhanceToolbarProps> = ({
  selectedText,
  position,
  onEnhance,
  onHighlight,
  onReference,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const intl = useIntl();

  useEffect(() => {
    if (!position) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [position, onClose]);

  useEffect(() => {
    if (position && ref.current) {
      ref.current.focus();
    }
  }, [position]);

  if (!position) return null;

  const toolbarWidth = 280;
  const toolbarHeight = 40;
  const clampedLeft = Math.min(position.left, window.innerWidth - toolbarWidth - 16);
  const clampedTop = position.top - toolbarHeight - 8 < 0
    ? position.top + 24
    : Math.max(16, position.top - toolbarHeight - 8);

  const preview =
    selectedText.length > MAX_PREVIEW
      ? selectedText.slice(0, MAX_PREVIEW) + '...'
      : selectedText;

  return (
    <div
      ref={ref}
      className={styles.toolbar}
      role="toolbar"
      aria-label={intl.formatMessage({ id: 'enhanceBtnAria' })}
      style={{ top: `${clampedTop}px`, left: `${Math.max(16, clampedLeft)}px` }}
      tabIndex={-1}
    >
      <span className={styles.preview} title={selectedText}>
        {preview}
      </span>
      <button
        className={styles.button}
        onClick={() => onEnhance(selectedText)}
        aria-label={intl.formatMessage({ id: 'enhanceBtnAria' })}
      >
        {intl.formatMessage({ id: 'enhanceBtn' })}
      </button>
      <button
        className={styles.button}
        onClick={() => onHighlight(selectedText)}
        aria-label={intl.formatMessage({ id: 'highlightBtnAria' })}
      >
        {intl.formatMessage({ id: 'highlightBtn' })}
      </button>
      <button
        className={styles.button}
        onClick={() => onReference(selectedText)}
        aria-label={intl.formatMessage({ id: 'referenceBtnAria' })}
      >
        {intl.formatMessage({ id: 'referenceBtn' })}
      </button>
      <button
        className={styles.closeButton}
        onClick={onClose}
        aria-label={intl.formatMessage({ id: 'closeToolbarAria' })}
      >
        ×
      </button>
    </div>
  );
};

export default EnhanceToolbar;
