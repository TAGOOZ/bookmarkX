import React, { useState, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import styles from './GlossaryPanel.module.css';

interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  created_at: string;
}

interface GlossaryPanelProps {
  bookmarkId?: string;
  terms?: GlossaryTerm[];
  onClose?: () => void;
}

const GlossaryPanel: React.FC<GlossaryPanelProps> = ({
  bookmarkId: _bookmarkId,
  terms: initialTerms,
  onClose,
}) => {
  const intl = useIntl();
  const [terms, setTerms] = useState<GlossaryTerm[]>(initialTerms || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTerms, setFilteredTerms] = useState<GlossaryTerm[]>(terms);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialTerms) {
      setTerms(initialTerms);
    }
  }, [initialTerms]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTerms(terms);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredTerms(
        terms.filter(
          (t) =>
            t.term.toLowerCase().includes(q) ||
            t.definition.toLowerCase().includes(q),
        ),
      );
    }
  }, [searchQuery, terms]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length === 0) return;
    setIsLoading(true);
    try {
      const results = await (window as any).api?.searchGlossary?.(query);
      if (Array.isArray(results)) {
        setTerms(results);
      }
    } catch {
      // search failed silently
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleExportMarkdown = useCallback(() => {
    const lines = filteredTerms.map((t) => `**${t.term}**: ${t.definition}`);
    const md = `# Glossary\n\n${lines.join('\n\n')}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glossary.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTerms]);

  const handleExportJson = useCallback(() => {
    const json = JSON.stringify(filteredTerms, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glossary.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredTerms]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {intl.formatMessage({ id: 'glossary' })}
        </h3>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={intl.formatMessage({ id: 'closeSettings' })}
        >
          ×
        </button>
      </div>
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={intl.formatMessage({ id: 'searchGlossary' })}
          aria-label={intl.formatMessage({ id: 'searchGlossary' })}
        />
        {isLoading && <span className={styles.spinner} />}
      </div>
      <div className={styles.exportBar}>
        <button
          className={styles.exportBtn}
          onClick={handleExportMarkdown}
          disabled={filteredTerms.length === 0}
        >
          ↓ MD
        </button>
        <button
          className={styles.exportBtn}
          onClick={handleExportJson}
          disabled={filteredTerms.length === 0}
        >
          ↓ JSON
        </button>
      </div>
      <div className={styles.termList}>
        {filteredTerms.length === 0 ? (
          <div className={styles.empty}>
            {searchQuery
              ? intl.formatMessage({ id: 'noResults' })
              : intl.formatMessage({ id: 'noGlossaryTerms' })}
          </div>
        ) : (
          filteredTerms.map((term) => (
            <div key={term.id} className={styles.termItem}>
              <div className={styles.termHeader}>
                <span className={styles.termName}>{term.term}</span>
              </div>
              <div className={styles.termDef}>{term.definition}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GlossaryPanel;
