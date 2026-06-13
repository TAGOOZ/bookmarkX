import React, { useState, useCallback } from 'react';
import styles from './ContentsBar.module.css';

interface Section {
  id: string;
  label: string;
  visible: boolean;
  level?: number;
}

interface ContentsBarProps {
  sections: Section[];
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

interface HoverInfo {
  id: string;
  top: number;
  left: number;
}

const ContentsBar: React.FC<ContentsBarProps> = ({
  sections,
  activeSection,
  onNavigate,
}) => {
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const visibleSections = sections.filter((s) => s.visible);

  const handleMouseEnter = useCallback((id: string, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setHover({ id, top: rect.top + rect.height / 2, left: rect.right + 8 });
  }, []);

  if (visibleSections.length === 0) return null;

  return (
    <nav className={styles.bar} aria-label="Contents">
      {visibleSections.map((section) => (
        <button
          key={section.id}
          className={`${styles.dash} ${section.id === activeSection ? styles.active : ''} ${section.level ? styles[`level${section.level}`] : ''}`}
          onClick={() => onNavigate(section.id)}
          onMouseEnter={(e) => handleMouseEnter(section.id, e)}
          onMouseLeave={() => setHover(null)}
          aria-label={section.label}
        >
          <span className={styles.dashLine} />
        </button>
      ))}
      {hover && (
        <span
          className={styles.label}
          style={{ top: `${hover.top}px`, left: `${hover.left}px`, transform: 'translateY(-50%)' }}
        >
          {visibleSections.find((s) => s.id === hover.id)?.label}
        </span>
      )}
    </nav>
  );
};

export default ContentsBar;
