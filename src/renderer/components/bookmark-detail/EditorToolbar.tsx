import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useIntl } from 'react-intl';
import styles from './EditorToolbar.module.css';

interface EditorToolbarProps {
  isReaderMode: boolean;
  isSummarizing: boolean;
  isGeneratingGlossary: boolean;
  showGlossaryPanel: boolean;
  onToggleReaderMode: () => void;
  onExpandCollapseAll: () => void;
  onSummarize: () => void;
  onGenerateGlossary: () => void;
  onExportMd: () => void;
  onExportJson: () => void;
  onImportMarkdown: () => void;
  onAddCustomSection: () => void;
  onToggleGlossaryPanel: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  isReaderMode,
  isSummarizing,
  isGeneratingGlossary,
  showGlossaryPanel,
  onToggleReaderMode,
  onExpandCollapseAll,
  onSummarize,
  onGenerateGlossary,
  onExportMd,
  onExportJson,
  onImportMarkdown,
  onAddCustomSection,
  onToggleGlossaryPanel,
}) => {
  const intl = useIntl();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const closeDropdown = useCallback(() => setDropdownOpen(false), []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        closeDropdown();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDropdown();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dropdownOpen, closeDropdown]);

  const handleDropdownAction = useCallback((action: () => void) => {
    action();
    closeDropdown();
  }, [closeDropdown]);

  return (
    <div className={styles.toolbar}>
      <div className={styles.leftGroup}>
        <button
          className={styles.toolBtn}
          onClick={onToggleReaderMode}
          aria-label={intl.formatMessage({ id: isReaderMode ? 'exitReaderMode' : 'readerMode' })}
          title={intl.formatMessage({ id: isReaderMode ? 'exitReaderMode' : 'readerMode' })}
        >
          {isReaderMode ? '✕' : '⛶'}
        </button>
        <button
          className={styles.toolBtn}
          onClick={onExpandCollapseAll}
          aria-label={intl.formatMessage({ id: 'expandCollapseAll' })}
          title={intl.formatMessage({ id: 'expandCollapseAll' })}
        >
          ⇕
        </button>
        <button
          className={`${styles.toolBtn} ${showGlossaryPanel ? styles.toolBtnActive : ''}`}
          onClick={onToggleGlossaryPanel}
          aria-label={intl.formatMessage({ id: 'openGlossaryPanel' })}
          title={intl.formatMessage({ id: 'openGlossaryPanel' })}
        >
          📖
        </button>
      </div>
      <div className={styles.rightGroup}>
        <div className={styles.dropdownContainer} ref={dropdownRef}>
          <button
            ref={buttonRef}
            className={`${styles.toolBtn} ${styles.dropdownTrigger} ${dropdownOpen ? styles.dropdownOpen : ''}`}
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label={intl.formatMessage({ id: 'actions' })}
            aria-expanded={dropdownOpen}
            aria-haspopup="menu"
          >
            {intl.formatMessage({ id: 'actions' })}
            <span className={styles.dropdownArrow}>▾</span>
          </button>
          {dropdownOpen && (
            <div className={styles.dropdown} role="menu">
              <div className={styles.dropdownSection}>
                <button
                  className={styles.dropdownItem}
                  onClick={() => handleDropdownAction(onSummarize)}
                  disabled={isSummarizing}
                  role="menuitem"
                >
                  {isSummarizing ? '...' : intl.formatMessage({ id: 'summarize' })}
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => handleDropdownAction(onGenerateGlossary)}
                  disabled={isGeneratingGlossary}
                  role="menuitem"
                >
                  {isGeneratingGlossary ? '...' : intl.formatMessage({ id: 'generateGlossary' })}
                </button>
              </div>
              <div className={styles.dropdownSeparator} />
              <div className={styles.dropdownSection}>
                <button
                  className={styles.dropdownItem}
                  onClick={() => handleDropdownAction(onExportMd)}
                  role="menuitem"
                >
                  {intl.formatMessage({ id: 'exportMd' })}
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => handleDropdownAction(onExportJson)}
                  role="menuitem"
                >
                  {intl.formatMessage({ id: 'exportJson' })}
                </button>
                <button
                  className={styles.dropdownItem}
                  onClick={() => handleDropdownAction(onImportMarkdown)}
                  role="menuitem"
                >
                  {intl.formatMessage({ id: 'importMd' })}
                </button>
              </div>
              <div className={styles.dropdownSeparator} />
              <div className={styles.dropdownSection}>
                <button
                  className={styles.dropdownItem}
                  onClick={() => handleDropdownAction(onAddCustomSection)}
                  role="menuitem"
                >
                  {intl.formatMessage({ id: 'addCustomSection' })}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorToolbar;
