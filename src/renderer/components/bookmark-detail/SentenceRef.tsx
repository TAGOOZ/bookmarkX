import React, { useState, useCallback } from 'react';
import styles from './SentenceRef.module.css';

interface SentenceRefProps {
  section: string;
  children: React.ReactNode;
}

const SentenceRef: React.FC<SentenceRefProps> = ({ section, children }) => {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = typeof children === 'string' ? children : String(children);
    const ref = `[[ref:${section}|${text}]]`;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(ref);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [section, children]);

  return (
    <span
      className={styles.wrapper}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      {hovered && (
        <button
          className={`${styles.icon} ${copied ? styles.copied : ''}`}
          onClick={handleCopy}
          aria-label="Copy reference"
          title="Copy reference link"
        >
          {copied ? '✓' : '🔗'}
        </button>
      )}
    </span>
  );
};

export default SentenceRef;
