import React, { useState } from 'react';
import styles from './ContentsSidebar.module.css';

interface Section {
  id: string;
  label: string;
  visible: boolean;
}

interface ContentsSidebarProps {
  sections: Section[];
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

const ContentsSidebar: React.FC<ContentsSidebarProps> = ({
  sections,
  activeSection,
  onNavigate,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const visibleSections = sections.filter((s) => s.visible);

  return (
    <nav className={styles.sidebar} aria-label="Contents">
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

export default ContentsSidebar;
