import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import { Block, PartialBlock, BlockNoteSchema, defaultBlockSpecs, defaultInlineContentSpecs } from '@blocknote/core';
import '@blocknote/mantine/style.css';
import styles from './BookmarkDetail.module.css';
import { BookmarkDetailData } from './types';
import { parseStoredBlocks } from './parseStoredBlocks';
import { bookmarkToBlocks } from './bookmarkToBlocks';
import { blocksToBookmark } from './blocksToBookmark';
import ContentsBar from './ContentsBar';
import EditorToolbar from './EditorToolbar';
import EnhanceToolbar from './EnhanceToolbar';
import GlossaryPanel from './GlossaryPanel';
import PageHeader from './PageHeader';
import CustomSectionComponent from './CustomSection';
import { detectDir } from './rtl-detect';
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
import { useChatSession } from './hooks/useChatSession';
import { useHashtags } from './hooks/useHashtags';
import { useCustomSections } from './hooks/useCustomSections';
import { useArticleExtraction } from './hooks/useArticleExtraction';
import { useSelectionToolbar } from './hooks/useSelectionToolbar';
import { useSummaryAndGlossary } from './hooks/useSummaryAndGlossary';
import { useEditorActions } from './hooks/useEditorActions';
import { useNotification } from './hooks/useNotification';
import { useSectionNavigation } from './hooks/useSectionNavigation';

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
  const [enhancedText, setEnhancedText] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isReaderMode, setIsReaderMode] = useState(false);
  const notesSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showGlossaryPanel, setShowGlossaryPanel] = useState(false);

  const { notification, setNotification } = useNotification();

  const { chatSessionId } = useChatSession({
    bookmarkId: bookmark.id,
    bookmarkChatSessionId: bookmark.chatSessionId,
    onBookmarkChange,
  });

  const { hashtags, addHashtag, removeHashtag } = useHashtags({
    bookmarkId: bookmark.id,
    onBookmarkChange,
  });

  const { customSections, createSection, updateSection, deleteSection, moveSection } = useCustomSections({
    bookmarkId: bookmark.id,
    intl,
  });

  const { isParsing, parseError, runExtraction } = useArticleExtraction({
    bookmark,
    editor,
    onBookmarkChange,
  });

  const { selectionToolbar, setSelectionToolbar, handleEnhance, handleHighlight, handleReference } = useSelectionToolbar({
    editorRef,
    bookmarkTitle: bookmark.title,
    bookmarkId: bookmark.id,
    setNotification,
  });

  const { isSummarizing, isGeneratingGlossary, handleSummarize, handleGenerateGlossary } = useSummaryAndGlossary({
    bookmark,
    onBookmarkChange,
    intl,
    setNotification,
  });

  const { handleExpandCollapseAll, handleExport, handleImportMarkdown } = useEditorActions({
    editor,
    bookmarkTitle: bookmark.title,
    intl,
    setNotification,
  });

  const { activeSection, getSections, handleNavigate } = useSectionNavigation({
    editorRef,
    scrollRef,
    intl,
  });

  const detectDirection = useCallback(() => {
    const d = detectDir(bookmark);
    if (editorRef.current) {
      editorRef.current.setAttribute('dir', d);
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
      window.api.saveNote?.(bookmark.id, {
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
        onAddHashtag={addHashtag}
        onRemoveHashtag={removeHashtag}
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
        onAddCustomSection={createSection}
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
                  onUpdate={updateSection}
                  onDelete={deleteSection}
                  onMoveUp={(id) => moveSection(id, 'up')}
                  onMoveDown={(id) => moveSection(id, 'down')}
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
