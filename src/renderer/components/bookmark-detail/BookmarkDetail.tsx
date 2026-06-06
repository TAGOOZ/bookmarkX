import React, { useState, useRef, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import styles from './BookmarkDetail.module.css';
import PageHeader from './PageHeader';
import ContentsSidebar from './ContentsSidebar';
import SectionRenderer, { SectionDef } from './SectionRenderer';
import SummarySection from './SummarySection';
import GlossarySection from './GlossarySection';
import ArticleView from './ArticleView';
import HighlightsSection from './HighlightsSection';
import NotesEditor from './NotesEditor';
import ChatPanel from './ChatPanel';
import { BookmarkDetailData, LayoutMode } from './types';

interface BookmarkDetailProps {
  bookmark: BookmarkDetailData | null;
  onNotesChange?: (notes: string) => void;
  onChatSend?: (message: string) => void;
  onGlossaryAdd?: (term: string, definition: string) => void;
  onEnhance?: (selection: string) => void;
  chatLoading?: boolean;
}

const LAYOUT_LABELS: Record<LayoutMode, string> = {
  linear: 'Linear',
  'two-column': 'Two Column',
  collapsible: 'Collapsible',
};

const BookmarkDetail: React.FC<BookmarkDetailProps> = ({
  bookmark,
  onNotesChange,
  onChatSend,
  onGlossaryAdd,
  chatLoading,
}) => {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('linear');
  const [activeSection, setActiveSection] = useState('summary');
  const contentRef = useRef<HTMLDivElement>(null);

  const handleNavigate = useCallback((sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  }, []);

  if (!bookmark) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <FormattedMessage id="selectBookmark" />
        </div>
      </div>
    );
  }

  const sections: SectionDef[] = [
    {
      id: 'summary',
      label: 'Summary',
      visible: !!(bookmark.summary || bookmark.summaryAr),
      owner: 'agent',
      render: () => (
        <SummarySection content={bookmark.summary} contentAr={bookmark.summaryAr} />
      ),
    },
    {
      id: 'glossary',
      label: 'Glossary',
      visible: !!(bookmark.glossaryTerms && bookmark.glossaryTerms.length > 0) || !!onGlossaryAdd,
      owner: 'shared',
      render: () => (
        <GlossarySection terms={bookmark.glossaryTerms} onAddTerm={onGlossaryAdd} />
      ),
    },
    {
      id: 'article',
      label: 'Article',
      visible: !!bookmark.content,
      owner: 'shared',
      render: () => <ArticleView content={bookmark.content} />,
    },
    {
      id: 'highlights',
      label: 'Highlights',
      visible: !!(bookmark.highlights && bookmark.highlights.length > 0),
      owner: 'user',
      render: () => <HighlightsSection highlights={bookmark.highlights || []} />,
    },
    {
      id: 'notes',
      label: 'Notes',
      visible: true,
      owner: 'user',
      render: () => (
        <NotesEditor content={bookmark.notes || ''} onChange={onNotesChange || (() => {})} />
      ),
    },
    {
      id: 'chat',
      label: 'Chat',
      visible: true,
      owner: 'agent',
      render: () => (
        <ChatPanel
          messages={bookmark.chatMessages || []}
          onSend={onChatSend || (() => {})}
          loading={chatLoading}
        />
      ),
    },
  ];

  const visibleSections = sections.filter((s) => s.visible);
  const contentsSections = visibleSections.map((s) => ({
    id: s.id,
    label: s.label,
    visible: true,
  }));

  return (
    <div className={`${styles.container} ${styles[layoutMode]}`}>
      <ContentsSidebar
        sections={contentsSections}
        activeSection={activeSection}
        onNavigate={handleNavigate}
      />
      <div className={styles.content} ref={contentRef}>
        <div className={styles.layoutToggle}>
          {(Object.keys(LAYOUT_LABELS) as LayoutMode[]).map((mode) => (
            <button
              key={mode}
              className={`${styles.layoutBtn} ${layoutMode === mode ? styles.layoutActive : ''}`}
              onClick={() => setLayoutMode(mode)}
            >
              {LAYOUT_LABELS[mode]}
            </button>
          ))}
        </div>
        <PageHeader
          title={bookmark.title}
          url={bookmark.url}
          topic={bookmark.topic}
          priority={bookmark.priority}
          contentType={bookmark.contentType}
          readingTime={bookmark.readingTime}
          createdAt={bookmark.createdAt}
        />
        <SectionRenderer sections={sections} />
      </div>
    </div>
  );
};

export default BookmarkDetail;
