import React, { useEffect, createContext, useContext } from 'react';
import { IntlProvider, useIntl } from 'react-intl';
import NavPanel from './components/NavPanel';
import { SplitLayout } from './components/split-view';
import Settings from './components/Settings';
import arMessages from '../../locales/ar.json';
import enMessages from '../../locales/en.json';
import { useBookmarkStore } from './stores/bookmarkStore';
import { useSettingsStore } from './stores/settingsStore';

export type { Bookmark } from './types';

export type Locale = 'ar' | 'en';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const LocaleContext = createContext<LocaleContextValue>({
  locale: 'ar',
  setLocale: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
});

export const useLocale = () => useContext(LocaleContext);

const messages: Record<string, Record<string, string>> = {
  ar: arMessages,
  en: enMessages,
};

function Titlebar() {
  const intl = useIntl();
  return <div className="titlebar">{intl.formatMessage({ id: 'appTitle' })}</div>;
}

function AppContent() {
  const { locale } = useIntl();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const bookmarks = useBookmarkStore((s) => s.bookmarks);
  const openBookmarks = useBookmarkStore((s) => s.openBookmarks);
  const splitState = useBookmarkStore((s) => s.splitState);
  const mockMode = useBookmarkStore((s) => s.mockMode);
  const handleBookmarkSelect = useBookmarkStore((s) => s.handleBookmarkSelect);
  const handleBookmarkChange = useBookmarkStore((s) => s.handleBookmarkChange);
  const handleSplitColumn = useBookmarkStore((s) => s.handleSplitColumn);
  const handleMergeColumn = useBookmarkStore((s) => s.handleMergeColumn);
  const handleColumnActive = useBookmarkStore((s) => s.handleColumnActive);
  const handleColumnResize = useBookmarkStore((s) => s.handleColumnResize);
  const setMockMode = useBookmarkStore((s) => s.setMockMode);
  const incrementRefreshKey = useBookmarkStore((s) => s.incrementRefreshKey);
  const fetchBookmarks = useBookmarkStore((s) => s.fetchBookmarks);
  const getActiveBookmark = useBookmarkStore((s) => s.getActiveBookmark);

  const showSettings = useSettingsStore((s) => s.showSettings);
  const setShowSettings = useSettingsStore((s) => s.setShowSettings);

  const activeBookmark = getActiveBookmark();
  const activeBookmarkId = activeBookmark?.id ?? null;

  const handleFetch = async () => {
    if (mockMode) return;
    await window.api.fetchBookmarks();
    incrementRefreshKey();
  };

  const handleClassify = async () => {
    if (mockMode) return;
    await window.api.classifyAndNotify();
    incrementRefreshKey();
  };

  const toggleMockMode = () => setMockMode((prev) => !prev);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  return (
    <>
      <Titlebar />
      <div className="app-container" style={{ flexDirection: dir === 'rtl' ? 'row' : 'row-reverse' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <SplitLayout
            splitState={splitState}
            openBookmarks={openBookmarks}
            onSplitColumn={handleSplitColumn}
            onMergeColumn={handleMergeColumn}
            onColumnActive={handleColumnActive}
            onColumnResize={handleColumnResize}
            onBookmarkChange={handleBookmarkChange}
            dir={dir}
          />
        </div>
        <NavPanel
          bookmarks={bookmarks}
          onSettingsClick={() => setShowSettings(true)}
          onFetchClick={handleFetch}
          onClassifyClick={handleClassify}
          onSelectBookmark={handleBookmarkSelect}
          selectedBookmarkId={activeBookmarkId}
          mockMode={mockMode}
          onToggleMockMode={toggleMockMode}
        />
        {showSettings && (
          <Settings onClose={() => setShowSettings(false)} mockMode={mockMode} />
        )}
      </div>
    </>
  );
}

function App() {
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);

  useEffect(() => {
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <IntlProvider messages={messages[locale]} locale={locale} defaultLocale="ar">
        <AppContent />
      </IntlProvider>
    </LocaleContext.Provider>
  );
}

export default App;
