import React from 'react';
import styles from './SectionRenderer.module.css';

export interface SectionDef {
  id: string;
  label: string;
  visible: boolean;
  owner: 'agent' | 'user' | 'shared';
  render: () => React.ReactNode;
}

interface SectionRendererProps {
  sections: SectionDef[];
}

const SectionRenderer: React.FC<SectionRendererProps> = ({ sections }) => {
  const visibleSections = sections.filter((s) => s.visible);
  if (visibleSections.length === 0) return null;

  return (
    <div className={styles.container}>
      {visibleSections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className={`${styles.section} ${styles[section.owner]}`}
          data-testid={`section-${section.id}`}
        >
          <h2 className={styles.label}>{section.label}</h2>
          {section.render()}
        </section>
      ))}
    </div>
  );
};

export default SectionRenderer;
