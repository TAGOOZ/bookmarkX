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
      let newSection: CustomSection;
      setCustomSections(prev => {
        newSection = {
          id: sectionId,
          bookmark_id: bookmarkId,
          title: newTitle,
          content: '',
          sort_order: prev.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return [...prev, newSection!];
      });
      return newSection!;
    } catch {
      return null;
    }
  }, [bookmarkId, intl]);

  const updateSection = useCallback(async (id: string, updates: Partial<CustomSection>) => {
    setCustomSections(prev => {
      const updated = prev.map((s) => (s.id === id ? { ...s, ...updates, updated_at: new Date().toISOString() } : s));
      return updated;
    });
    try {
      await window.api.updateCustomSection(id, { title: updates.title, content: updates.content });
    } catch {
      // silently fail
    }
  }, []);

  const deleteSection = useCallback(async (id: string) => {
    setCustomSections(prev => {
      const updated = prev.filter((s) => s.id !== id);
      return updated;
    });
    try {
      await window.api.deleteCustomSection(id);
    } catch {
      // silently fail
    }
  }, []);

  const moveSection = useCallback(async (id: string, direction: 'up' | 'down') => {
    setCustomSections(prev => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const updated = [...prev];
      [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
      updated.forEach((s, i) => { s.sort_order = i; });
      return updated;
    });
    try {
      const currentSections = await window.api.getCustomSections(bookmarkId);
      const reordered = currentSections.sort((a, b) => a.sort_order - b.sort_order);
      await window.api.reorderCustomSections(reordered.map((s) => s.id));
    } catch {
      // silently fail
    }
  }, [bookmarkId]);

  return { customSections, createSection, updateSection, deleteSection, moveSection };
}