import { BlockNoteEditor, Block } from '@blocknote/core';

export interface EnhanceToolbarOptions {
  onEnhance: (selectedText: string, block: Block) => void;
}

export function createEnhanceToolbarPlugin(options: EnhanceToolbarOptions) {
  return {
    name: 'enhanceToolbar',
    onStart: (editor: BlockNoteEditor) => {
      let toolbarEl: HTMLDivElement | null = null;

      const removeToolbar = () => {
        if (toolbarEl) {
          toolbarEl.remove();
          toolbarEl = null;
        }
      };

      const handleSelectionChange = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !selection.rangeCount) {
          removeToolbar();
          return;
        }

        const selectedText = selection.toString().trim();
        if (!selectedText) {
          removeToolbar();
          return;
        }

        const range = selection.getRangeAt(0);
        const editorEl = editor.domElement;
        if (!editorEl || !editorEl.contains(range.commonAncestorContainer)) {
          removeToolbar();
          return;
        }

        const block = editor.getTextCursorPosition().block;
        if (!block) {
          removeToolbar();
          return;
        }

        if (!toolbarEl) {
          toolbarEl = document.createElement('div');
          toolbarEl.contentEditable = 'false';
          toolbarEl.style.cssText =
            'position:fixed;z-index:9999;background:#1a1a1a;border:1px solid #444;border-radius:4px;padding:4px 8px;display:flex;gap:4px;box-shadow:0 2px 8px rgba(0,0,0,0.3);';
          const btn = document.createElement('button');
          btn.textContent = '✨ Enhance';
          btn.style.cssText =
            'background:#2563eb;color:#fff;border:none;border-radius:3px;padding:4px 10px;cursor:pointer;font-size:12px;';
          btn.addEventListener('mousedown', (e) => {
            e.preventDefault();
            options.onEnhance(selectedText, block);
            removeToolbar();
          });
          toolbarEl.appendChild(btn);
          document.body.appendChild(toolbarEl);
        }

        const rect = range.getBoundingClientRect();
        toolbarEl.style.left = `${rect.left + rect.width / 2 - 50}px`;
        toolbarEl.style.top = `${rect.top - 40}px`;
      };

      document.addEventListener('selectionchange', handleSelectionChange);

      return () => {
        document.removeEventListener('selectionchange', handleSelectionChange);
        removeToolbar();
      };
    },
  };
}
