import React from 'react';
import styles from './SummarySection.module.css';

interface SummarySectionProps {
  content?: string;
  contentAr?: string;
}

const SummarySection: React.FC<SummarySectionProps> = ({ content, contentAr }) => {
  if (!content && !contentAr) return null;

  return (
    <div className={styles.container}>
      {contentAr && (
        <p className={styles.summary}>{contentAr}</p>
      )}
      {content && (
        <p className={styles.summaryEn}>{content}</p>
      )}
    </div>
  );
};

export default SummarySection;
