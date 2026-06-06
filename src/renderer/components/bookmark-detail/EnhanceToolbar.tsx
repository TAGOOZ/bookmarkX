import React, { useEffect, useRef } from 'react';
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

  const preview =
    selectedText.length > MAX_PREVIEW
      ? selectedText.slice(0, MAX_PREVIEW) + '...'
      : selectedText;

  return (
    <div
      ref={ref}
      className={styles.toolbar}
      role="toolbar"
      aria-label="Text actions"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      tabIndex={-1}
    >
      <span className={styles.preview} title={selectedText}>
        {preview}
      </span>
      <button
        className={styles.button}
        onClick={() => onEnhance(selectedText)}
        aria-label="Enhance selected text"
      >
        Enhance
      </button>
      <button
        className={styles.button}
        onClick={() => onHighlight(selectedText)}
        aria-label="Highlight selected text"
      >
        Highlight
      </button>
      <button
        className={styles.button}
        onClick={() => onReference(selectedText)}
        aria-label="Copy reference link"
      >
        Reference
      </button>
      <button
        className={styles.closeButton}
        onClick={onClose}
        aria-label="Close toolbar"
      >
        ×
      </button>
    </div>
  );
};

export default EnhanceToolbar;
