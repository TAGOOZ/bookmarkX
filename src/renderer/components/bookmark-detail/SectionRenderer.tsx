import React from 'react';
import styles from './SectionRenderer.module.css';

export interface SectionData {
  id: string;
  type: 'summary' | 'glossary' | 'article' | 'highlights' | 'notes' | 'chat' | 'custom';
  title: string;
  content: React.ReactNode;
  isAgent?: boolean;
}

interface SectionRendererProps {
  sections: SectionData[];
  onSectionClick?: (sectionId: string) => void;
}

const SECTION_COLORS: Record<string, string> = {
  summary: 'var(--section-agent-bg)',
  glossary: 'var(--section-agent-bg)',
  article: 'var(--background-primary)',
  highlights: 'var(--section-user-bg)',
  notes: 'var(--section-user-bg)',
  chat: 'var(--section-agent-bg)',
  custom: 'var(--background-secondary)',
};

const SectionRenderer: React.FC<SectionRendererProps> = ({
  sections,
  onSectionClick,
}) => {
  return (
    <div className={styles.container}>
      {sections.map((section) => (
        <div
          key={section.id}
          className={styles.section}
          style={{ '--section-bg': SECTION_COLORS[section.type] || 'var(--background-secondary)' } as React.CSSProperties}
          data-section-id={section.id}
          onClick={() => onSectionClick?.(section.id)}
        >
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>{section.title}</span>
            {section.isAgent !== undefined && (
              <span className={`${styles.sectionBadge} ${section.isAgent ? styles.agentBadge : styles.userBadge}`}>
                {section.isAgent ? 'AI' : 'User'}
              </span>
            )}
          </div>
          <div className={styles.sectionContent}>
            {section.content}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SectionRenderer;
