import React, { useCallback, useEffect, useRef } from 'react';
import { FormattedMessage } from 'react-intl';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { Block, PartialBlock } from '@blocknote/core';
import '@blocknote/mantine/style.css';
import styles from './BookmarkDetail.module.css';
import PageHeader from './PageHeader';
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

interface BookmarkEditorProps {
  bookmark: BookmarkDetailData;
  onBlocksChange?: (blocks: string) => void;
  onBookmarkChange?: (updated: Partial<BookmarkDetailData>) => void;
}

const BookmarkEditor: React.FC<BookmarkEditorProps> = ({
  bookmark,
  onBlocksChange,
  onBookmarkChange,
}) => {
  const initialContent = parseStoredBlocks(bookmark.blocks) || bookmarkToBlocks(bookmark);
  const editor = useCreateBlockNote({ initialContent });
  const isExternalUpdate = useRef(true);
  const lastBookmarkId = useRef<string | null>(null);

  useEffect(() => {
    if (bookmark.id === lastBookmarkId.current) return;
    lastBookmarkId.current = bookmark.id;
    isExternalUpdate.current = true;
    const newBlocks = parseStoredBlocks(bookmark.blocks) || bookmarkToBlocks(bookmark);
    editor.replaceBlocks(editor.document, newBlocks);
    isExternalUpdate.current = false;
  }, [bookmark, editor]);

  const handleChange = useCallback(() => {
    if (isExternalUpdate.current) return;
    const blocks = editor.document;
    const serialized = JSON.stringify(blocks);
    onBlocksChange?.(serialized);
    const updated = blocksToBookmark(blocks as Block[], bookmark);
    onBookmarkChange?.(updated);
  }, [editor, onBlocksChange, onBookmarkChange, bookmark]);

  return (
    <div className={styles.editorWrapper}>
      <BlockNoteView
        editor={editor}
        onChange={handleChange}
        className={styles.editor}
        theme="light"
      />
    </div>
  );
};

const BookmarkDetail: React.FC<BookmarkDetailProps> = ({
  bookmark,
  onBlocksChange,
  onBookmarkChange,
}) => {
  if (!bookmark) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <FormattedMessage id="selectBookmark" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <PageHeader
          title={bookmark.title}
          url={bookmark.url}
          topic={bookmark.topic}
          priority={bookmark.priority}
          contentType={bookmark.contentType}
          readingTime={bookmark.readingTime}
          createdAt={bookmark.createdAt}
        />
        <BookmarkEditor
          bookmark={bookmark}
          onBlocksChange={onBlocksChange}
          onBookmarkChange={onBookmarkChange}
        />
      </div>
    </div>
  );
};

export default BookmarkDetail;
