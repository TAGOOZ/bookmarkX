import React, { useState } from 'react';
import styles from './ContentsBar.module.css';

interface Section {
  id: string;
  label: string;
  visible: boolean;
}

interface ContentsBarProps {
  sections: Section[];
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

const ContentsBar: React.FC<ContentsBarProps> = ({
  sections,
  activeSection,
  onNavigate,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const visibleSections = sections.filter((s) => s.visible);

  return (
    <nav className={styles.bar} aria-label="Contents">
      {visibleSections.map((section) => (
        <button
          key={section.id}
          className={`${styles.dash} ${section.id === activeSection ? styles.active : ''}`}
          onClick={() => onNavigate(section.id)}
          onMouseEnter={() => setHoveredId(section.id)}
          onMouseLeave={() => setHoveredId(null)}
          aria-label={section.label}
        >
          <span className={styles.dashLine} />
          {hoveredId === section.id && (
            <span className={styles.label}>{section.label}</span>
          )}
        </button>
      ))}
    </nav>
  );
};

export default ContentsBar;
