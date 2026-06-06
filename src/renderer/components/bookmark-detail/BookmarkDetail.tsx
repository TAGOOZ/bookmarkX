import React, { useCallback, useEffect, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { Block, PartialBlock } from '@blocknote/core';
import '@blocknote/mantine/style.css';
import styles from './BookmarkDetail.module.css';
import { BookmarkDetailData } from './types';
import { bookmarkToBlocks } from './bookmarkToBlocks';
import { blocksToBookmark } from './blocksToBookmark';

interface BookmarkDetailProps {
  bookmark: BookmarkDetailData | null;
  onBlocksChange?: (blocks: string) => void;
  onBookmarkChange?: (updated: Partial<BookmarkDetailData>) => void;
}

function parseStoredBlocks(blocksJson: string | undefined): PartialBlock[] | undefined {
  if (!blocksJson) return undefined;
  try {
    const parsed = JSON.parse(blocksJson);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return undefined;
  } catch {
    return undefined;
  }
}

const ARABIC_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function isArabic(text: string): boolean {
  return ARABIC_RE.test(text);
}

function getBlocksText(blocks: PartialBlock[]): string {
  return JSON.stringify(blocks);
}

const BookmarkDetail: React.FC<BookmarkDetailProps> = ({
  bookmark,
  onBlocksChange,
  onBookmarkChange,
}) => {
  if (!bookmark) {
    return (
      <div className={styles.empty}>
        <FormattedMessage id="selectBookmark" />
      </div>
    );
  }

  const initialContent = parseStoredBlocks(bookmark.blocks) || bookmarkToBlocks(bookmark);

  return (
    <BookmarkEditor
      bookmark={bookmark}
      initialContent={initialContent}
      onBlocksChange={onBlocksChange}
      onBookmarkChange={onBookmarkChange}
    />
  );
};

interface BookmarkEditorProps {
  bookmark: BookmarkDetailData;
  initialContent: PartialBlock[];
  onBlocksChange?: (blocks: string) => void;
  onBookmarkChange?: (updated: Partial<BookmarkDetailData>) => void;
}

const BookmarkEditor: React.FC<BookmarkEditorProps> = ({
  bookmark,
  initialContent,
  onBlocksChange,
  onBookmarkChange,
}) => {
  const editor = useCreateBlockNote({ initialContent });
  const isExternalUpdate = useRef(true);
  const lastBookmarkId = useRef<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const detectDirection = useCallback(() => {
    const text = getBlocksText(editor.document);
    const dir = isArabic(text) ? 'rtl' : 'ltr';
    if (editorRef.current) {
      editorRef.current.setAttribute('dir', dir);
    }
  }, [editor]);

  useEffect(() => {
    if (bookmark.id === lastBookmarkId.current) return;
    lastBookmarkId.current = bookmark.id;
    isExternalUpdate.current = true;
    const newBlocks = parseStoredBlocks(bookmark.blocks) || bookmarkToBlocks(bookmark);
    editor.replaceBlocks(editor.document, newBlocks);
    isExternalUpdate.current = false;
    detectDirection();
  }, [bookmark, editor, detectDirection]);

  const handleChange = useCallback(() => {
    if (isExternalUpdate.current) return;
    detectDirection();
    const blocks = editor.document;
    const serialized = JSON.stringify(blocks);
    onBlocksChange?.(serialized);
    const updated = blocksToBookmark(blocks as Block[], bookmark);
    onBookmarkChange?.(updated);
  }, [editor, onBlocksChange, onBookmarkChange, bookmark, detectDirection]);

  return (
    <div ref={editorRef} dir="ltr">
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        className={styles.editor}
        theme="dark"
      />
    </div>
  );
};

export default BookmarkDetail;
