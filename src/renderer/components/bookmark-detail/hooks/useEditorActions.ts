import { useCallback } from 'react';
import { IntlShape } from 'react-intl';
import type { BlockNoteEditor } from '@blocknote/core';
import { blocksToMarkdown } from '../../../../parser/blocks-to-markdown';

interface UseEditorActionsProps {
  editor: BlockNoteEditor;
  bookmarkTitle: string;
  intl: IntlShape;
  setNotification: (notification: string | null) => void;
}

export function useEditorActions({ editor, bookmarkTitle, intl, setNotification }: UseEditorActionsProps) {
  const handleExpandCollapseAll = useCallback(() => {
    const blocks = editor.document;
    const cloneAndToggle = (blocks: Array<{ props?: { isExpanded?: boolean }; children?: unknown[] }>): Array<Record<string, unknown>> => {
      return blocks.map((block) => {
        const cloned: Record<string, unknown> = { ...block };
        if (cloned.props && typeof cloned.props === 'object') {
          cloned.props = { ...cloned.props as Record<string, unknown> };
          if ((cloned.props as Record<string, unknown>).isExpanded !== undefined) {
            (cloned.props as Record<string, unknown>).isExpanded = !(cloned.props as Record<string, unknown>).isExpanded;
          }
        }
        if (block.children && Array.isArray(block.children)) {
          cloned.children = cloneAndToggle(block.children as Array<{ props?: { isExpanded?: boolean }; children?: unknown[] }>);
        }
        return cloned;
      });
    };
    const newBlocks = cloneAndToggle(blocks as Array<{ props?: { isExpanded?: boolean }; children?: unknown[] }>);
    editor.replaceBlocks(editor.document, newBlocks);
  }, [editor]);

  const handleExport = useCallback(async (format: 'md' | 'json' = 'json') => {
    try {
      const blocks = editor.document;
      const content = format === 'json' ? JSON.stringify(blocks, null, 2) : blocksToMarkdown(blocks);
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