import { useCallback } from 'react';
import { IntlShape } from 'react-intl';
import type { BlockNoteEditor } from '@blocknote/core';

interface UseEditorActionsProps {
  editor: BlockNoteEditor;
  bookmarkTitle: string;
  intl: IntlShape;
  setNotification: (notification: string | null) => void;
}

export function useEditorActions({ editor, bookmarkTitle, intl, setNotification }: UseEditorActionsProps) {
  const handleExpandCollapseAll = useCallback(() => {
    const blocks = editor.document;
    const toggleExpansion = (blocks: Array<{ props?: { isExpanded?: boolean }; children?: unknown[] }>): void => {
      for (const block of blocks) {
        if (block.props?.isExpanded !== undefined) {
          block.props.isExpanded = !block.props.isExpanded;
        }
        if (block.children && Array.isArray(block.children)) {
          toggleExpansion(block.children as Array<{ props?: { isExpanded?: boolean }; children?: unknown[] }>);
        }
      }
    };
    toggleExpansion(blocks as Array<{ props?: { isExpanded?: boolean }; children?: unknown[] }>);
    editor.replaceBlocks(editor.document, editor.document);
  }, [editor]);

  const handleExport = useCallback(async (format: 'md' | 'json' = 'json') => {
    try {
      const blocks = editor.document;
      const content = format === 'json' ? JSON.stringify(blocks, null, 2) : JSON.stringify(blocks);
      const result = await window.api.exportBookmark(format, content, bookmarkTitle || 'bookmark');
      if (result.success && !result.cancelled) {
        setNotification(intl.formatMessage({ id: 'exported', defaultMessage: 'Exported successfully' }));
      }
    } catch {
      setNotification(intl.formatMessage({ id: 'exportFailed', defaultMessage: 'Export failed' }));
    }
  }, [editor, bookmarkTitle, intl, setNotification]);

  const handleImportMarkdown = useCallback(async () => {
    try {
      const result = await window.api.importMarkdown();
      if (result.content && !result.cancelled) {
        setNotification(intl.formatMessage({ id: 'importing', defaultMessage: 'Importing...' }));
        const lines = result.content.split('\n');
        const blocks = lines.map((line) => ({
          type: 'paragraph' as const,
          content: line,
        }));
        editor.replaceBlocks(editor.document, blocks);
        setNotification(intl.formatMessage({ id: 'imported', defaultMessage: 'Imported successfully' }));
      }
    } catch {
      setNotification(intl.formatMessage({ id: 'importFailed', defaultMessage: 'Import failed' }));
    }
  }, [editor, intl, setNotification]);

  return { handleExpandCollapseAll, handleExport, handleImportMarkdown };
}