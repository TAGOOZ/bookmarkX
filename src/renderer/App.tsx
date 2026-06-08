import React, { useState, useCallback, useMemo, useEffect, createContext, useContext } from 'react';
import { IntlProvider, useIntl } from 'react-intl';
import NavPanel from './components/NavPanel';
import BookmarkDetail from './components/bookmark-detail/BookmarkDetail';
import BookmarkTabs from './components/bookmark-detail/BookmarkTabs';
import Settings from './components/Settings';
import { mockBookmarks } from './mockData';
import arMessages from '../../locales/ar.json';
import enMessages from '../../locales/en.json';
import type { BookmarkDetailData } from './components/bookmark-detail/types';

export interface Bookmark {
  id: string;
  title: string;
  titleAr: string | null;
  titleEn: string | null;
  url: string;
  topic: string;
  priority: 'high' | 'medium' | 'low';
  contentType: string;
  content: string;
  createdAt: string;
  readingTime?: number;
}

const MOCK_MODE_KEY = 'bookmarkx-mock-mode';
const LOCALE_KEY = 'bookmarkx-locale';

const messages: Record<string, Record<string, string>> = {
  ar: arMessages,
  en: enMessages,
};

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

function Titlebar() {
  const intl = useIntl();
  return <div className="titlebar">{intl.formatMessage({ id: 'appTitle' })}</div>;
}

function AppContent() {
  const { locale } = useIntl();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const [openBookmarks, setOpenBookmarks] = useState<Bookmark[]>([]);
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mockMode, setMockMode] = useState(() => {
    try {
      return localStorage.getItem(MOCK_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(MOCK_MODE_KEY, String(mockMode));
    } catch {
      // localStorage not available
    }
  }, [mockMode]);

  const activeBookmark = useMemo(
    () => openBookmarks.find((b) => b.id === activeBookmarkId) ?? null,
    [openBookmarks, activeBookmarkId],
  );

  const handleBookmarkChange = useCallback((bookmarkId: string, updated: Partial<BookmarkDetailData>) => {
    setOpenBookmarks((prev) =>
      prev.map((b) => (b.id === bookmarkId ? { ...b, ...updated } : b)),
    );
    setBookmarks((prev) =>
      prev.map((b) => (b.id === bookmarkId ? { ...b, ...updated } : b)),
    );
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBlocksChange = useCallback((_bookmarkId: string, _blocks: string) => {
    // Blocks are stored via onBookmarkChange; this is kept for future granular persistence
  }, []);

  const handleBookmarkSelect = useCallback((bookmark: Bookmark) => {
    setOpenBookmarks((prev) => {
      const exists = prev.find((b) => b.id === bookmark.id);
      if (exists) return prev;
      return [...prev, bookmark];
    });
    setActiveBookmarkId(bookmark.id);
  }, []);

  const handleTabSelect = useCallback((bookmarkId: string) => {
    setActiveBookmarkId(bookmarkId);
  }, []);

  const handleTabClose = useCallback((bookmarkId: string) => {
    setOpenBookmarks((prev) => prev.filter((b) => b.id !== bookmarkId));
    setActiveBookmarkId((prev) => {
      if (prev !== bookmarkId) return prev;
      return null;
    });
  }, []);

  const handleFetch = useCallback(async () => {
    if (mockMode) return;
    await window.api.fetchBookmarks();
    setRefreshKey((k) => k + 1);
  }, [mockMode]);

  const handleClassify = useCallback(async () => {
    if (mockMode) return;
    await window.api.classifyAndNotify();
    setRefreshKey((k) => k + 1);
  }, [mockMode]);

  const toggleMockMode = useCallback(() => {
    setMockMode((prev) => !prev);
  }, []);

  const fetchBookmarks = useCallback(async () => {
    if (mockMode) {
      setBookmarks(mockBookmarks);
      return;
    }

    try {
      const [dbBookmarks, classifications] = await Promise.all([
        window.api.getBookmarks(),
        window.api.getClassifications(),
      ]);

      const classificationMap = new Map(
        classifications.map((c) => [c.bookmark_id, c]),
      );

      const mappedBookmarks: Bookmark[] = dbBookmarks.map((dbBookmark) => {
        const classification = classificationMap.get(dbBookmark.id);
        const titleAr = dbBookmark.title_ar || dbBookmark.title || dbBookmark.tweet_text || null;
        const titleEn = dbBookmark.title_en || dbBookmark.title || dbBookmark.tweet_text || null;
        const displayTitle = locale === 'ar'
          ? (titleAr || titleEn || 'Untitled')
          : (titleEn || titleAr || 'Untitled');
        return {
          id: dbBookmark.id,
          title: displayTitle,
          titleAr,
          titleEn,
          url: dbBookmark.url,
          topic: classification?.topic || 'Uncategorized',
          priority:
            (classification?.priority as 'high' | 'medium' | 'low') || 'medium',
          contentType: dbBookmark.content_type,
          content: dbBookmark.tweet_text || '',
          createdAt: dbBookmark.fetched_at,
          readingTime: classification?.reading_time_min || undefined,
        };
      });

      setBookmarks(mappedBookmarks);
    } catch {
      setBookmarks([]);
    }
  }, [mockMode]);

  useEffect(() => {
    fetchBookmarks();
  }, [refreshKey, fetchBookmarks]);

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
          <BookmarkTabs
            openBookmarks={openBookmarks}
            activeBookmarkId={activeBookmarkId}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
            dir={dir}
          />
          <BookmarkDetail
            bookmark={activeBookmark}
            onBookmarkChange={
              activeBookmark
                ? (updated: Partial<BookmarkDetailData>) => handleBookmarkChange(activeBookmark.id, updated)
                : undefined
            }
            onBlocksChange={
              activeBookmark
                ? (blocks: string) => handleBlocksChange(activeBookmark.id, blocks)
                : undefined
            }
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
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem(LOCALE_KEY);
      if (stored === 'ar' || stored === 'en') return stored;
    } catch { /* localStorage may be unavailable */ }
    return 'ar';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_KEY, newLocale);
    } catch { /* localStorage may be unavailable */ }
  }, []);

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
