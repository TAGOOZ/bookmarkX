import { useState, useEffect, useCallback } from 'react';
import { IntlShape } from 'react-intl';
import type { CustomSection } from '../types';

interface UseCustomSectionsProps {
  bookmarkId: string;
  intl: IntlShape;
}

export function useCustomSections({ bookmarkId, intl }: UseCustomSectionsProps) {
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);

  useEffect(() => {
    const loadSections = async () => {
      try {
        const result = await window.api.getCustomSections(bookmarkId);
        if (Array.isArray(result)) {
          setCustomSections(result.sort((a, b) => a.sort_order - b.sort_order));
        }
      } catch {
        setCustomSections([]);
      }
    };
    loadSections();
  }, [bookmarkId]);

  const createSection = useCallback(async (title?: string) => {
    const newTitle = title || intl.formatMessage({ id: 'newSection', defaultMessage: 'New Section' });
    try {
      const sectionId = await window.api.createCustomSection(bookmarkId, newTitle);
      const newSection: CustomSection = {
        id: sectionId,
        bookmark_id: bookmarkId,
        title: newTitle,
        content: '',
        sort_order: customSections.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCustomSections([...customSections, newSection]);
      return newSection;
    } catch {
      return null;
    }
  }, [bookmarkId, customSections, intl]);

  const updateSection = useCallback(async (id: string, updates: Partial<CustomSection>) => {
    const updated = customSections.map((s) => (s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s));
    setCustomSections(updated);
    try {
      await window.api.updateCustomSection(id, { title: updates.title, content: updates.content });
    } catch {
      // silently fail
    }
  }, [customSections]);

  const deleteSection = useCallback(async (id: string) => {
    const updated = customSections.filter((s) => s.id !== id);
    setCustomSections(updated);
    try {
      await window.api.deleteCustomSection(id);
    } catch {
      // silently fail
    }
  }, [customSections]);

  const moveSection = useCallback(async (id: string, direction: 'up' | 'down') => {
    const idx = customSections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= customSections.length) return;
    const updated = [...customSections];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    updated.forEach((s, i) => { s.sort_order = i; });
    setCustomSections(updated);
    try {
      await window.api.reorderCustomSections(updated.map((s) => s.id));
    } catch {
      // silently fail
    }
  }, [customSections]);

  return { customSections, createSection, updateSection, deleteSection, moveSection };
}