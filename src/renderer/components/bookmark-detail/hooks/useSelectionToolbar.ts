import { useState, useCallback } from 'react';
import type { BlockNoteEditor } from '@blocknote/core';

interface SelectionToolbar {
  text: string;
  position: { top: number; left: number } | null;
}

interface UseSelectionToolbarProps {
  editor?: BlockNoteEditor;
  editorRef?: React.RefObject<HTMLDivElement | null>;
  bookmarkTitle: string;
  bookmarkId: string;
  setNotification: (notification: string | null) => void;
}

export function useSelectionToolbar({ editor, bookmarkTitle, bookmarkId, setNotification }: UseSelectionToolbarProps) {
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

    if (!editor) {
      // TODO: Full reference pipeline — needs editor reference for cross-section linking.
      // When editor is available, the flow should be:
      //   1. Find or create a target section to reference
      //   2. Insert a referenceChip inline pointing to that section
      //   3. Optionally persist the reference relationship via window.api
      setNotification('Reference insertion requires editor (not yet wired)');
      setSelectionToolbar({ text: '', position: null });
      return;
    }

    try {
      const cursorBlock = editor.getTextCursorPosition();
      if (!cursorBlock.block) {
        setNotification('No active block to insert reference into');
        setSelectionToolbar({ text: '', position: null });
        return;
      }

      const referenceChip = {
        type: 'referenceChip' as const,
        props: {
          sourceSection: bookmarkTitle || 'Untitled',
          sentence: text,
          sourceId: bookmarkId,
        },
      };

      const block = cursorBlock.block as any;
      const existingContent: any[] = Array.isArray(block.content)
        ? block.content
        : typeof block.content === 'string'
          ? [{ type: 'text', text: block.content, styles: {} }]
          : [];

      const updatedContent = [
        ...existingContent,
        { type: 'text', text: ' ', styles: {} },
        referenceChip,
      ];

      editor.updateBlock(cursorBlock.block, { content: updatedContent });
      setNotification('Reference added');
    } catch (err) {
      console.error('[useSelectionToolbar] Failed to insert reference chip:', err);
      setNotification('Failed to insert reference');
    }

    setSelectionToolbar({ text: '', position: null });
  }, [selectionToolbar.text, editor, bookmarkTitle, bookmarkId, setNotification]);

  return { selectionToolbar, setSelectionToolbar, handleEnhance, handleHighlight, handleReference };
}