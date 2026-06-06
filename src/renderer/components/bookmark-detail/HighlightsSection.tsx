import React from 'react';
import styles from './HighlightsSection.module.css';

interface Highlight {
  id: string;
  text: string;
  note?: string;
  color?: string;
}

interface HighlightsSectionProps {
  highlights: Highlight[];
}

const HighlightsSection: React.FC<HighlightsSectionProps> = ({ highlights }) => {
  if (highlights.length === 0) return null;

  return (
    <div className={styles.container}>
      {highlights.map((h) => (
        <blockquote
          key={h.id}
          className={styles.highlight}
          style={{ borderRightColor: h.color || 'var(--accent-color)' }}
        >
          <p className={styles.text}>{h.text}</p>
          {h.note && <p className={styles.note}>{h.note}</p>}
        </blockquote>
      ))}
    </div>
  );
};

export default HighlightsSection;
