import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from 'react-intl';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { Block, PartialBlock, BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import '@blocknote/mantine/style.css';
import styles from './BookmarkDetail.module.css';
import { BookmarkDetailData } from './types';
import { bookmarkToBlocks } from './bookmarkToBlocks';
import { blocksToBookmark } from './blocksToBookmark';
import ContentsBar from './ContentsBar';
import EnhanceToolbar from './EnhanceToolbar';
import { isArabic, detectDir } from './rtl-detect';
import {
  createDualLangBlock,
  createCollapsibleArticleBlock,
  createArticleReaderBlock,
  createChatBlock,
  createHighlightBlock,
  createGlossaryTermInline,
  createReferenceChipInline,
} from './extensions';

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    dualLang: createDualLangBlock(),
    collapsibleArticle: createCollapsibleArticleBlock(),
    articleReader: createArticleReaderBlock(),
    chat: createChatBlock(),
    highlight: createHighlightBlock(),
  },
  inlineContentSpecs: {
    ...defaultInlineContentSpecs,
    glossaryTerm: createGlossaryTermInline(),
    referenceChip: createReferenceChipInline(),
  },
});

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
  const editor = useCreateBlockNote({ initialContent, schema });
  const isExternalUpdate = useRef(true);
  const lastBookmarkId = useRef<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('summary');
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [selectionToolbar, setSelectionToolbar] = useState<{
    text: string;
    position: { top: number; left: number };
  } | null>(null);
  const [enhancedText, setEnhancedText] = useState<string | null>(null);

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
    let cancelled = false;
    const createSession = async () => {
      if (bookmark.chatSessionId) {
        setChatSessionId(bookmark.chatSessionId);
      } else if (bookmark.id && !chatSessionId) {
        try {
          const sessionId = await (window as any).api?.createChatSession?.(bookmark.id);
          if (!cancelled && sessionId) {
            setChatSessionId(sessionId);
            onBookmarkChange?.({ chatSessionId: sessionId });
          }
        } catch {
          // Failed to create chat session — chat section won't render
        }
      }
    };
    createSession();
    return () => { cancelled = true; };
  }, [bookmark.id, bookmark.chatSessionId]);

  useEffect(() => {
    if (bookmark.id === lastBookmarkId.current) return;
    lastBookmarkId.current = bookmark.id;
    isExternalUpdate.current = true;
    const bookmarkWithSession = chatSessionId ? { ...bookmark, chatSessionId } : bookmark;
    const newBlocks = parseStoredBlocks(bookmark.blocks) || bookmarkToBlocks(bookmarkWithSession);
    editor.replaceBlocks(editor.document, newBlocks);
    isExternalUpdate.current = false;
    detectDirection();
    stripEditorPadding(editorRef.current);
  }, [bookmark, editor, detectDirection, chatSessionId]);

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

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setSelectionToolbar(null);
      return;
    }
    const text = selection.toString().trim();
    if (text.length < 2) {
      setSelectionToolbar(null);
      return;
    }
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelectionToolbar({
      text,
      position: { top: rect.top - 44, left: rect.left + rect.width / 2 - 120 },
    });
  }, []);

  useEffect(() => {
    const editorEl = editorRef.current;
    if (!editorEl) return;
    editorEl.addEventListener('mouseup', handleSelectionChange);
    editorEl.addEventListener('keyup', handleSelectionChange);
    return () => {
      editorEl.removeEventListener('mouseup', handleSelectionChange);
      editorEl.removeEventListener('keyup', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  const handleEnhance = useCallback(async (text: string) => {
    setSelectionToolbar(null);
    try {
      const result = await (window as any).api?.enhanceNote?.(text, bookmark.title || undefined);
      if (result?.enhanced_text) {
        setEnhancedText(result.enhanced_text);
      }
    } catch {
      // enhance failed silently
    }
  }, [bookmark.title]);

  const handleHighlight = useCallback(async (text: string) => {
    setSelectionToolbar(null);
    try {
      await (window as any).api?.saveHighlight?.(bookmark.id, {
        selected_text: text,
        note: null,
        color: '#e69819',
      });
    } catch {
      // save failed silently
    }
  }, [bookmark.id]);

  const handleReference = useCallback((text: string) => {
    setSelectionToolbar(null);
    const ref = `[[ref:${bookmark.title || 'section'}|${text}]]`;
    navigator.clipboard.writeText(ref).catch(() => { /* clipboard unavailable */ });
  }, [bookmark.title]);

  return (
    <div ref={editorRef} dir="ltr" className={styles.pageLayout}>
      <style>{`
        .ProseMirror-selectednode > .bn-block-content > *,
        .bn-block-content.ProseMirror-selectednode > * {
          outline: 2px solid var(--accent-color) !important;
          outline-offset: 2px;
        }
      `}</style>
      <ContentsBar
        sections={getSections()}
        activeSection={activeSection}
        onNavigate={handleNavigate}
      />
      <EnhanceToolbar
        selectedText={selectionToolbar?.text || ''}
        position={selectionToolbar?.position || null}
        onEnhance={handleEnhance}
        onHighlight={handleHighlight}
        onReference={handleReference}
        onClose={() => setSelectionToolbar(null)}
      />
      {enhancedText && (
        <div className={styles.enhancedBanner}>
          <span className={styles.enhancedLabel}>Enhanced:</span>
          <span className={styles.enhancedContent}>{enhancedText}</span>
          <button
            className={styles.enhancedClose}
            onClick={() => setEnhancedText(null)}
            aria-label="Dismiss enhanced text"
          >
            ×
          </button>
        </div>
      )}
      <div ref={scrollRef} className={styles.editorScroll}>
        <BlockNoteView
          editor={editor}
          onChange={handleChange}
          className={styles.editor}
          theme="light"
        />
      </div>
    </div>
  );
};

export default BookmarkDetail;
