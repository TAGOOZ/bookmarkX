import { useState, useCallback, useEffect, RefObject } from 'react';
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

function scanHeadings(editorEl: HTMLDivElement | null): Section[] {
  if (!editorEl) return [];

  // BlockNote renders headings as div[data-type="heading"] with data-level
  const blocknoteHeadings = editorEl.querySelectorAll('[data-type="heading"]');
  if (blocknoteHeadings.length > 0) {
    return Array.from(blocknoteHeadings).map((el, i) => ({
      id: `section-${i}`,
      label: el.textContent || '',
      visible: true,
      level: parseInt(el.getAttribute('data-level') || '1'),
    }));
  }

  // Fallback: standard h1-h6 elements
  const headings = editorEl.querySelectorAll('h1, h2, h3, h4, h5, h6');
  return Array.from(headings).map((heading, i) => ({
    id: `section-${i}`,
    label: heading.textContent || '',
    visible: true,
    level: parseInt(heading.tagName.charAt(1)),
  }));
}

export function useSectionNavigation({ editorRef }: UseSectionNavigationProps) {
  const [activeSection, setActiveSection] = useState<string>('');
  const [sections, setSections] = useState<Section[]>([]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const update = () => setSections(scanHeadings(el));

    update();

    const observer = new MutationObserver(update);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [editorRef]);

  const getSections = useCallback((): Section[] => {
    return scanHeadings(editorRef.current);
  }, [editorRef]);

  const handleNavigate = useCallback((sectionId: string) => {
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;

    // Try BlockNote headings first
    const blocknoteHeadings = editorRef.current?.querySelectorAll('[data-type="heading"]');
    if (blocknoteHeadings && blocknoteHeadings[idx]) {
      blocknoteHeadings[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
      return;
    }

    // Fallback: standard headings
    const headings = editorRef.current?.querySelectorAll('h1, h2, h3, h4, h5, h6');
    if (headings && headings[idx]) {
      headings[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  }, [sections, editorRef]);

  return { activeSection, sections, getSections, handleNavigate };
}
