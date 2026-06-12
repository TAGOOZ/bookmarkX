import { useState, useCallback } from 'react';

interface SelectionToolbar {
  text: string;
  position: { top: number; left: number } | null;
}

interface UseSelectionToolbarProps {
  editorRef?: React.RefObject<HTMLDivElement | null>;
  bookmarkTitle: string;
  bookmarkId: string;
  setNotification: (notification: string | null) => void;
}

export function useSelectionToolbar({ bookmarkTitle, bookmarkId, setNotification }: UseSelectionToolbarProps) {
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbar>({
    text: '',
    position: null,
  });

  const handleEnhance = useCallback(async () => {
    const text = selectionToolbar.text;
    if (!text) return;
    setNotification('Enhancing text...');
    try {
      const result = await window.api.enhanceNote(text, bookmarkTitle);
      if (result && result.enhanced_text) {
        setNotification('Text enhanced successfully');
      }
    } catch {
      setNotification('Failed to enhance text');
    }
    setSelectionToolbar({ text: '', position: null });
  }, [selectionToolbar.text, bookmarkTitle, setNotification]);

  const handleHighlight = useCallback(async () => {
    const text = selectionToolbar.text;
    if (!text) return;
    try {
      await window.api.saveHighlight(bookmarkId, { selected_text: text, note: null, color: null });
      setNotification('Highlight added');
    } catch {
      setNotification('Failed to add highlight');
    }
    setSelectionToolbar({ text: '', position: null });
  }, [selectionToolbar.text, bookmarkId, setNotification]);

  const handleReference = useCallback(async () => {
    const text = selectionToolbar.text;
    if (!text) return;
    setNotification('Creating reference...');
    setSelectionToolbar({ text: '', position: null });
  }, [selectionToolbar.text, setNotification]);

  return { selectionToolbar, setSelectionToolbar, handleEnhance, handleHighlight, handleReference };
}