import { useState, useCallback, RefObject } from 'react';
import { IntlShape } from 'react-intl';

interface Section {
  id: string;
  label: string;
  visible: boolean;
  level?: number;
}

interface UseSectionNavigationProps {
  editorRef: RefObject<HTMLDivElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
  intl: IntlShape;
}

export function useSectionNavigation({ editorRef }: UseSectionNavigationProps) {
  const [activeSection, setActiveSection] = useState<string>('');

  const getSections = useCallback((): Section[] => {
    if (!editorRef.current) return [];
    const headings = editorRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return Array.from(headings).map((heading, i) => ({
      id: `section-${i}`,
      label: heading.textContent || '',
      visible: true,
      level: parseInt(heading.tagName.charAt(1)),
    }));
  }, [editorRef]);

  const handleNavigate = useCallback((sectionId: string) => {
    const sections = getSections();
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const headings = editorRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings && headings[idx]) {
      headings[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  }, [getSections, editorRef]);

  return { activeSection, getSections, handleNavigate };
}