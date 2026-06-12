import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { Block, PartialBlock, BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import '@blocknote/mantine/style.css';
import styles from './BookmarkDetail.module.css';
import { BookmarkDetailData, CustomSection } from './types';
import { bookmarkToBlocks } from './bookmarkToBlocks';
import { blocksToBookmark } from './blocksToBookmark';
import ContentsBar from './ContentsBar';
import EditorToolbar from './EditorToolbar';
import EnhanceToolbar from './EnhanceToolbar';
import GlossaryPanel from './GlossaryPanel';
import PageHeader from './PageHeader';
import CustomSectionComponent from './CustomSection';
import { detectDir } from './rtl-detect';
import { blocksToMarkdown } from '../../../parser/blocks-to-markdown';
import { markdownToBlocks } from '../../../parser/markdown-to-blocks';
import { useLocale } from '../../App';
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
  const intl = useIntl();
  const { locale } = useLocale();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const editor = useCreateBlockNote({ initialContent, schema });
  const isExternalUpdate = useRef(true);
  const lastBookmarkId = useRef<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState('summary');
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [tocEntries, setTocEntries] = useState<Array<{ id: string; label: string; level: number }>>([]);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [selectionToolbar, setSelectionToolbar] = useState<{
    text: string;
    position: { top: number; left: number };
  } | null>(null);
  const [enhancedText, setEnhancedText] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isReaderMode, setIsReaderMode] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingGlossary, setIsGeneratingGlossary] = useState(false);
  const notesSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hashtags, setHashtags] = useState<Array<{ id: string; name: string }>>([]);
  const sessionRequestId = useRef(0);
  const [showGlossaryPanel, setShowGlossaryPanel] = useState(false);
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);

  const getSections = useCallback(() => {
    const base = SECTION_IDS.map((id) => ({
      id,
      label: intl.formatMessage({ id }),
      visible: true,
      level: 0,
    }));
    const articleHeadings = tocEntries.map((e) => ({
      id: e.id,
      label: e.label,
      visible: true,
      level: e.level,
    }));
    return [...base, ...articleHeadings];
  }, [tocEntries]);

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
    const requestId = ++sessionRequestId.current;
    const createSession = async () => {
      if (bookmark.chatSessionId) {
        if (requestId === sessionRequestId.current) {
          setChatSessionId(bookmark.chatSessionId);
        }
      } else if (bookmark.id && !chatSessionId) {
        try {
          const sessionId = await (window as any).api?.createChatSession?.(bookmark.id);
          if (requestId === sessionRequestId.current && sessionId) {
            setChatSessionId(sessionId);
            onBookmarkChange?.({ chatSessionId: sessionId });
          }
        } catch (e) {
          // createChatSession failed silently
        }
      }
    };
    createSession();
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
      const headings = editorEl.querySelectorAll('h2, h3');
      const toc: Array<{ id: string; label: string; level: number }> = [];
      headings.forEach((h) => {
        const el = h as HTMLElement;
        const text = el.textContent?.toLowerCase().trim() || '';
        if (SECTION_IDS.includes(text)) {
          sectionRefs.current.set(text, el);
        } else if (text && !text.startsWith('[')) {
          const level = el.tagName === 'H3' ? 3 : 2;
          const id = `heading-${toc.length}`;
          el.id = id;
          sectionRefs.current.set(id, el);
          toc.push({ id, label: el.textContent?.trim() || '', level });
        }
      });
      setTocEntries((prev) => {
        if (prev.length === toc.length && prev.every((e, i) => e.id === toc[i].id && e.label === toc[i].label && e.level === toc[i].level)) return prev;
        return toc;
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

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl;
      const maxScroll = scrollHeight - clientHeight;
      setScrollProgress(maxScroll > 0 ? Math.min(scrollTop / maxScroll, 1) : 0);
    };
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!bookmark.id || !bookmark.notes) return;
    if (notesSaveTimerRef.current) {
      clearTimeout(notesSaveTimerRef.current);
    }
    let cancelled = false;
    notesSaveTimerRef.current = setTimeout(() => {
      if (cancelled) return;
      (window as any).api?.saveNote?.(bookmark.id, {
        title: null,
        content: bookmark.notes || null,
      });
    }, 1000);
    return () => {
      cancelled = true;
      if (notesSaveTimerRef.current) {
        clearTimeout(notesSaveTimerRef.current);
      }
    };
  }, [bookmark.id, bookmark.notes]);

  useEffect(() => {
    if (!bookmark.id) return;
    (window as any).api?.getBookmarkHashtags?.(bookmark.id)
      .then((tags: Array<{ id: string; name: string }>) => {
        if (tags) setHashtags(tags);
      })
      .catch((err: unknown) => {
        console.warn('Failed to load hashtags:', err);
      });
  }, [bookmark.id]);

  const handleAddHashtag = useCallback(async (name: string) => {
    if (!bookmark.id || !name.trim()) return;
    try {
      await (window as any).api?.setBookmarkHashtags?.(
        bookmark.id,
        [...hashtags.map((h) => h.name), name.trim()],
      );
      const updated = await (window as any).api?.getBookmarkHashtags?.(bookmark.id);
      if (updated) setHashtags(updated);
      onBookmarkChange?.({ hashtags: updated });
    } catch {
      // addHashtag failed silently
    }
  }, [bookmark.id, hashtags, onBookmarkChange]);

  const handleRemoveHashtag = useCallback(async (hashtagId: string) => {
    if (!bookmark.id) return;
    try {
      await (window as any).api?.detachHashtagFromBookmark?.(bookmark.id, hashtagId);
      const updated = await (window as any).api?.getBookmarkHashtags?.(bookmark.id);
      if (updated) setHashtags(updated);
      onBookmarkChange?.({ hashtags: updated });
    } catch (err) {
      console.error('Failed to remove hashtag:', err);
    }
  }, [bookmark.id, onBookmarkChange]);

  useEffect(() => {
    if (!bookmark.id) return;
    (window as any).api?.getCustomSections?.(bookmark.id)
      .then((sections: CustomSection[]) => {
        if (sections) setCustomSections(sections);
      })
      .catch((err: unknown) => {
        console.warn('Failed to load custom sections:', err);
      });
  }, [bookmark.id]);

  const handleCreateCustomSection = useCallback(async () => {
    if (!bookmark.id) return;
    try {
      const id = await (window as any).api?.createCustomSection?.(
        bookmark.id,
        intl.formatMessage({ id: 'newSection' }),
      );
      if (id) {
        const updated = await (window as any).api?.getCustomSections?.(bookmark.id);
        if (updated) setCustomSections(updated);
      }
    } catch (err) {
      console.error('Failed to create custom section:', err);
    }
  }, [bookmark.id, intl]);

  const handleUpdateCustomSection = useCallback(async (sectionId: string, data: { title?: string; content?: string }) => {
    if (!bookmark.id) return;
    try {
      await (window as any).api?.updateCustomSection?.(sectionId, data);
      const updated = await (window as any).api?.getCustomSections?.(bookmark.id);
      if (updated) setCustomSections(updated);
    } catch (err) {
      console.error('Failed to update custom section:', err);
    }
  }, [bookmark.id]);

  const handleDeleteCustomSection = useCallback(async (sectionId: string) => {
    if (!bookmark.id) return;
    try {
      await (window as any).api?.deleteCustomSection?.(sectionId);
      const updated = await (window as any).api?.getCustomSections?.(bookmark.id);
      if (updated) setCustomSections(updated);
    } catch (err) {
      console.error('Failed to delete custom section:', err);
    }
  }, [bookmark.id]);

  const handleMoveCustomSection = useCallback(async (sectionId: string, direction: 'up' | 'down') => {
    if (!bookmark.id) return;
    const sorted = [...customSections].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((s) => s.id === sectionId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const tmpOrder = sorted[idx].sort_order;
    sorted[idx] = { ...sorted[idx], sort_order: sorted[swapIdx].sort_order };
    sorted[swapIdx] = { ...sorted[swapIdx], sort_order: tmpOrder };
    try {
      await (window as any).api?.reorderCustomSections?.(sorted.map((s) => s.id));
      const updated = await (window as any).api?.getCustomSections?.(bookmark.id);
      if (updated) setCustomSections(updated);
    } catch (err) {
      console.error('Failed to reorder custom sections:', err);
    }
  }, [bookmark.id, customSections]);

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

  const runExtraction = useCallback(async (isRetry = false) => {
    if (!bookmark.url) return;
    if (!isRetry && (bookmark.articleBlocks || isParsing)) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const result = await (window as any).api?.extractArticle?.(bookmark.id, bookmark.url);
      if (!result?.blocks_json) return;
      const newBlocks = parseStoredBlocks(result.blocks_json) || bookmarkToBlocks({
        ...bookmark,
        articleBlocks: result.blocks_json,
        articleWordCount: result.word_count,
        articleReadingTime: result.reading_time,
        ogTitle: result.og_title,
        ogDescription: result.og_description,
        ogImage: result.og_image,
        ogSiteName: result.og_site_name,
      });
      isExternalUpdate.current = true;
      editor.replaceBlocks(editor.document, newBlocks);
      isExternalUpdate.current = false;
      onBookmarkChange?.({
        articleBlocks: result.blocks_json,
        articleWordCount: result.word_count,
        articleReadingTime: result.reading_time,
        ogTitle: result.og_title,
        ogDescription: result.og_description,
        ogImage: result.og_image,
        ogSiteName: result.og_site_name,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse article';
      setParseError(message);
    } finally {
      setIsParsing(false);
    }
  }, [bookmark, editor, onBookmarkChange]);

  useEffect(() => {
    runExtraction(false);
  }, [bookmark.id, bookmark.url, bookmark.articleBlocks]);

  const handleEnhance = useCallback(async (text: string) => {
    setSelectionToolbar(null);
    try {
      const result = await (window as any).api?.enhanceNote?.(text, bookmark.title || undefined);
      if (result?.enhanced_text) {
        setEnhancedText(result.enhanced_text);
      }
    } catch (err) {
      console.error('Failed to enhance note:', err);
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
    } catch (err) {
      console.error('Failed to save highlight:', err);
    }
  }, [bookmark.id]);

  const handleReference = useCallback((text: string) => {
    setSelectionToolbar(null);
    const ref = `[[ref:${bookmark.title || 'section'}|${text}]]`;
    navigator.clipboard.writeText(ref).catch(() => { /* clipboard unavailable */ });
  }, [bookmark.title]);

  const _handleDeleteHighlight = useCallback(async (highlightId: string) => {
    try {
      await (window as any).api?.deleteHighlight?.(highlightId);
    } catch (err) {
      console.error('Failed to delete highlight:', err);
    }
  }, []);

  const _handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      await (window as any).api?.deleteNote?.(noteId);
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  }, []);

  const handleSummarize = useCallback(async () => {
    if (!bookmark.id || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const result = await (window as any).api?.summarizeBookmark?.(bookmark.id);
      if (result) {
        onBookmarkChange?.({
          summary: result.content_en || result.summary || '',
          summaryAr: result.content_ar || result.summaryAr || '',
        });
        setNotification(intl.formatMessage({ id: 'summarizeSuccess' }));
      }
    } catch {
      setNotification(intl.formatMessage({ id: 'summarizeError' }));
    } finally {
      setIsSummarizing(false);
    }
  }, [bookmark.id, bookmark.title, isSummarizing, onBookmarkChange, intl]);

  const handleGenerateGlossary = useCallback(async () => {
    if (!bookmark.id || isGeneratingGlossary) return;
    setIsGeneratingGlossary(true);
    try {
      const content = bookmark.summary || bookmark.content || '';
      const result = await (window as any).api?.generateGlossary?.(bookmark.id, content, bookmark.title);
      if (result && Array.isArray(result)) {
        const existing = bookmark.glossaryTerms || [];
        onBookmarkChange?.({
          glossaryTerms: [...existing, ...result],
        });
        setNotification(intl.formatMessage({ id: 'glossaryGenerated' }));
      }
    } catch {
      setNotification(intl.formatMessage({ id: 'glossaryError' }));
    } finally {
      setIsGeneratingGlossary(false);
    }
  }, [bookmark.id, bookmark.title, bookmark.summary, bookmark.content, bookmark.glossaryTerms, isGeneratingGlossary, onBookmarkChange, intl]);

  const handleExport = useCallback(async (format: 'md' | 'json') => {
    const blocks = editor.document as any;
    const title = bookmark.title || 'bookmark';
    if (format === 'md') {
      const md = blocksToMarkdown(blocks);
      const result = await (window as any).api?.exportBookmark?.('md', md, `${title}.md`);
      if (result?.success) {
        setNotification(intl.formatMessage({ id: 'exportSuccess' }));
      }
    } else {
      const json = JSON.stringify(blocks, null, 2);
      const result = await (window as any).api?.exportBookmark?.('json', json, `${title}.json`);
      if (result?.success) {
        setNotification(intl.formatMessage({ id: 'exportSuccess' }));
      }
    }
  }, [editor, bookmark, intl]);

  const handleImportMarkdown = useCallback(async () => {
    const result = await (window as any).api?.importMarkdown?.();
    if (result?.content) {
      const blocks = markdownToBlocks(result.content);
      if (blocks.length > 0) {
        isExternalUpdate.current = true;
        editor.replaceBlocks(editor.document, blocks as any);
        isExternalUpdate.current = false;
        setNotification(intl.formatMessage({ id: 'importSuccess' }));
      }
    }
  }, [editor, intl]);

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const handleExpandCollapseAll = useCallback(() => {
    const blocks = editor.document;
    const anyCollapsed = blocks.some(
      (b) => (b.type === 'articleReader' || b.type === 'collapsibleArticle') && !b.props.isExpanded,
    );
    const nextExpanded = anyCollapsed;
    blocks.forEach((b) => {
      if (b.type === 'articleReader' || b.type === 'collapsibleArticle') {
        editor.updateBlock(b, { props: { isExpanded: nextExpanded } });
      }
    });
  }, [editor]);

  return (
    <div ref={editorRef} dir={dir} className={`${styles.pageLayout} ${isReaderMode ? styles.readerMode : ''}`}>
      <style>{`
        .ProseMirror-selectednode > .bn-block-content > *,
        .bn-block-content.ProseMirror-selectednode > * {
          outline: 2px solid var(--accent-color) !important;
          outline-offset: 2px;
        }
      `}</style>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${scrollProgress * 100}%` }} />
      </div>
      <ContentsBar
        sections={getSections()}
        activeSection={activeSection}
        onNavigate={handleNavigate}
      />
      <PageHeader
        title={bookmark.title || ''}
        url={bookmark.url}
        topic={bookmark.topic}
        contentType={bookmark.contentType}
        priority={bookmark.priority}
        readingTime={bookmark.readingTime}
        createdAt={bookmark.createdAt}
        hashtags={hashtags}
        onOpenUrl={(url) => window.open(url, '_blank')}
        onAddHashtag={handleAddHashtag}
        onRemoveHashtag={handleRemoveHashtag}
      />
      <EditorToolbar
        isReaderMode={isReaderMode}
        isSummarizing={isSummarizing}
        isGeneratingGlossary={isGeneratingGlossary}
        showGlossaryPanel={showGlossaryPanel}
        onToggleReaderMode={() => setIsReaderMode(!isReaderMode)}
        onExpandCollapseAll={handleExpandCollapseAll}
        onSummarize={handleSummarize}
        onGenerateGlossary={handleGenerateGlossary}
        onExportMd={() => handleExport('md')}
        onExportJson={() => handleExport('json')}
        onImportMarkdown={handleImportMarkdown}
        onAddCustomSection={handleCreateCustomSection}
        onToggleGlossaryPanel={() => setShowGlossaryPanel(!showGlossaryPanel)}
      />
      {notification && (
        <div className={styles.notification}>{notification}</div>
      )}
      {enhancedText && (
        <div className={styles.toast} role="alert">
          <span className={styles.toastLabel}>{intl.formatMessage({ id: 'enhanced' })}</span>
          <span className={styles.toastContent}>{enhancedText}</span>
          <button
            className={styles.toastClose}
            onClick={() => setEnhancedText(null)}
            aria-label={intl.formatMessage({ id: 'dismissEnhanced' })}
          >
            ×
          </button>
        </div>
      )}
      <EnhanceToolbar
        selectedText={selectionToolbar?.text || ''}
        position={selectionToolbar?.position || null}
        onEnhance={handleEnhance}
        onHighlight={handleHighlight}
        onReference={handleReference}
        onClose={() => setSelectionToolbar(null)}
      />
      {isParsing && (
        <div className={styles.parsingBanner}>
          <span className={styles.spinner} />
          <span>{intl.formatMessage({ id: 'parsingArticle' })}</span>
        </div>
      )}
      {parseError && !isParsing && (
        <div className={styles.errorBanner}>
          <div className={styles.errorContent}>
            <span className={styles.errorIcon}>!</span>
            <div className={styles.errorText}>
              <span className={styles.errorTitle}>{intl.formatMessage({ id: 'parseErrorTitle' })}</span>
              <span className={styles.errorMessage}>{parseError}</span>
            </div>
          </div>
          <button
            className={styles.retryButton}
            onClick={() => runExtraction(true)}
          >
            {intl.formatMessage({ id: 'retry' })}
          </button>
        </div>
      )}
      <div className={styles.mainContent}>
        <div ref={scrollRef} className={styles.editorScroll}>
          <BlockNoteView
            editor={editor}
            onChange={handleChange}
            className={styles.editor}
            theme="light"
          />
          {customSections.length > 0 && (
            <div className={styles.customSectionsContainer}>
              {customSections.sort((a, b) => a.sort_order - b.sort_order).map((section) => (
                <CustomSectionComponent
                  key={section.id}
                  section={section}
                  onUpdate={handleUpdateCustomSection}
                  onDelete={handleDeleteCustomSection}
                  onMoveUp={(id) => handleMoveCustomSection(id, 'up')}
                  onMoveDown={(id) => handleMoveCustomSection(id, 'down')}
                />
              ))}
            </div>
          )}
        </div>
        {showGlossaryPanel && (
          <GlossaryPanel
            bookmarkId={bookmark.id}
            terms={bookmark.glossaryTerms?.map((t, i) => ({
              id: `${i}`,
              term: t.term,
              definition: t.definition,
              created_at: new Date().toISOString(),
            }))}
            onClose={() => setShowGlossaryPanel(false)}
          />
        )}
      </div>
    </div>
  );
};

export default BookmarkDetail;
