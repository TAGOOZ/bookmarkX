import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { PartialBlock } from '@blocknote/core';
import '@blocknote/mantine/style.css';
import styles from './NotesEditor.module.css';

function getTheme(): 'light' | 'dark' {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

interface NotesEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function parseBlocks(content: string): PartialBlock[] | undefined {
  if (!content) return undefined;
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}

function fallbackBlocks(content: string): PartialBlock[] {
  return [{ type: 'paragraph', content: content }];
}

const NotesEditor: React.FC<NotesEditorProps> = ({ content, onChange }) => {
  const initialContent = parseBlocks(content) || fallbackBlocks(content);
  const editor = useCreateBlockNote({ initialContent });
  const isExternalUpdate = useRef(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(getTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(getTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    isExternalUpdate.current = true;
    const newBlocks = parseBlocks(content);
    if (newBlocks) {
      editor.replaceBlocks(editor.document, newBlocks);
    } else {
      editor.replaceBlocks(editor.document, fallbackBlocks(content));
    }
    isExternalUpdate.current = false;
  }, [content, editor]);

  const handleChange = useCallback(() => {
    if (isExternalUpdate.current) return;
    const blocks = editor.document;
    const serialized = JSON.stringify(blocks);
    onChange(serialized);
  }, [editor, onChange]);

  return (
    <div className={styles.container}>
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        className={styles.editor}
        theme={theme}
      />
    </div>
  );
};

export default NotesEditor;
