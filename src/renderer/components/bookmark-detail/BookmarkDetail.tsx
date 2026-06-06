import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { Block, PartialBlock } from '@blocknote/core';
import '@blocknote/mantine/style.css';
import styles from './BookmarkDetail.module.css';
import { BookmarkDetailData } from './types';
import { bookmarkToBlocks } from './bookmarkToBlocks';
import { blocksToBookmark } from './blocksToBookmark';
import ContentsSidebar from './ContentsSidebar';

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

function detectDir(bookmark: BookmarkDetailData): string {
  if (bookmark.title && isArabic(bookmark.title)) return 'rtl';
  if (bookmark.content && isArabic(bookmark.content)) return 'rtl';
  if (bookmark.summary && isArabic(bookmark.summary)) return 'rtl';
  return 'ltr';
}

function stripEditorPadding(container: HTMLElement | null) {
  const bnEditor = container?.querySelector('.bn-editor') as HTMLElement | null;
  if (bnEditor) {
    bnEditor.style.paddingInline = '0';
  }
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

const SECTION_IDS = ['summary', 'glossary', 'article', 'highlights', 'notes', 'chat'];

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('summary');
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  const getSections = useCallback(() => {
    return SECTION_IDS.map((id) => ({
      id,
      label: id.charAt(0).toUpperCase() + id.slice(1),
      visible: true,
    }));
  }, []);

  const detectDirection = useCallback(() => {
    const dir = detectDir(bookmark);
    if (editorRef.current) {
      editorRef.current.setAttribute('dir', dir);
    }
  }, [bookmark]);

  useEffect(() => {
    stripEditorPadding(editorRef.current);
    const observer = new MutationObserver(() => stripEditorPadding(editorRef.current));
    if (editorRef.current) {
      observer.observe(editorRef.current, { childList: true, subtree: true });
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (bookmark.id === lastBookmarkId.current) return;
    lastBookmarkId.current = bookmark.id;
    isExternalUpdate.current = true;
    const newBlocks = parseStoredBlocks(bookmark.blocks) || bookmarkToBlocks(bookmark);
    editor.replaceBlocks(editor.document, newBlocks);
    isExternalUpdate.current = false;
    detectDirection();
    stripEditorPadding(editorRef.current);
  }, [bookmark, editor, detectDirection]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const findSections = () => {
      const editorEl = editorRef.current;
      if (!editorEl) return;
      const headings = editorEl.querySelectorAll('h2');
      headings.forEach((h) => {
        const text = h.textContent?.toLowerCase().trim() || '';
        if (SECTION_IDS.includes(text)) {
          sectionRefs.current.set(text, h);
        }
      });
    };

    findSections();
    const mutationObs = new MutationObserver(findSections);
    mutationObs.observe(editorRef.current!, { childList: true, subtree: true });

    let intersectionObs: IntersectionObserver | null = null;

    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const text = entry.target.textContent?.toLowerCase().trim() || '';
              if (SECTION_IDS.includes(text)) {
                setActiveSection(text);
              }
            }
          }
        },
        { root: scrollEl, threshold: 0.3 },
      );

      sectionRefs.current.forEach((el) => intersectionObs!.observe(el));
    }

    return () => {
      mutationObs.disconnect();
      intersectionObs?.disconnect();
    };
  }, [editor]);

  const handleNavigate = useCallback((sectionId: string) => {
    const el = sectionRefs.current.get(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

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
    <div ref={editorRef} dir="ltr" className={styles.pageLayout}>
      <ContentsSidebar
        sections={getSections()}
        activeSection={activeSection}
        onNavigate={handleNavigate}
      />
      <div className={styles.editorColumn}>
        <div ref={scrollRef} className={styles.editorScroll}>
          <BlockNoteView
            editor={editor}
            onChange={handleChange}
            className={styles.editor}
            theme="dark"
          />
        </div>
      </div>
    </div>
  );
};

export default BookmarkDetail;
