import React, { useState, useCallback, useMemo } from 'react';
import { IntlProvider, useIntl } from 'react-intl';
import Sidebar from './components/Sidebar';
import BookmarkList from './components/BookmarkList';
import BookmarkDetail from './components/bookmark-detail/BookmarkDetail';
import BookmarkTabs from './components/bookmark-detail/BookmarkTabs';
import Settings from './components/Settings';

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  topic: string;
  priority: 'high' | 'medium' | 'low';
  contentType: string;
  content: string;
  createdAt: string;
}

export interface FilterState {
  priority: string;
  topic: string;
  contentType: string;
}

const messages = {
  appName: 'بوكماركس',
  bookmarks: 'الإشارات المرجعية',
  settings: 'الإعدادات',
  search: 'بحث...',
  priority: 'الأولوية',
  topics: 'المواضيع',
  contentTypes: 'أنواع المحتوى',
  all: 'الكل',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
  allTopics: 'جميع المواضيع',
  allTypes: 'جميع الأنواع',
  تكنولوجيا: 'تكنولوجيا',
  تصميم: 'تصميم',
  أعمال: 'أعمال',
  علوم: 'علوم',
  مقال: 'مقال',
  فيديو: 'فيديو',
  صورة: 'صورة',
  رابط: 'رابط',
  save: 'حفظ',
  cancel: 'إلغاء',
  apiKey: 'مفتاح API',
  authToken: 'رمز المصادقة',
  ct0: 'CT0 Cookie',
  chromeProfile: 'ملف Chrome الشخصي',
  selectBookmark: 'اختر إشارة مرجعية',
  selectBookmarkDescription: 'اختر إشارة مرجعية من القائمة لعرض التفاصيل',
  openLink: 'فتح الرابط',
  noBookmarks: 'لا توجد إشارات مرجعية',
  noBookmarksDescription: 'لم يتم العثور على إشارات مرجعية تطابق البحث',
  fetchNow: 'جلب الآن',
  fetching: 'جاري الجلب...',
  classifyNow: 'تصنيف الآن',
  classifying: 'جاري التصنيف...',
};

function AppContent() {
  const { locale } = useIntl();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const [openBookmarks, setOpenBookmarks] = useState<Bookmark[]>([]);
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    priority: '',
    topic: '',
    contentType: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const activeBookmark = useMemo(
    () => openBookmarks.find((b) => b.id === activeBookmarkId) ?? null,
    [openBookmarks, activeBookmarkId],
  );

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

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleFetch = useCallback(async () => {
    await window.api.fetchBookmarks();
    setRefreshKey((k) => k + 1);
  }, []);

  const handleClassify = useCallback(async () => {
    await window.api.classifyAndNotify();
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <>
      <div className="titlebar">bookmarkx</div>
      <div className="app-container">
        <Sidebar
          onSettingsClick={() => setShowSettings(true)}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFetchClick={handleFetch}
          onClassifyClick={handleClassify}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <BookmarkTabs
            openBookmarks={openBookmarks}
            activeBookmarkId={activeBookmarkId}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
            dir={dir}
          />
          <BookmarkDetail bookmark={activeBookmark} />
        </div>
        <BookmarkList
          selectedBookmark={activeBookmark}
          onBookmarkSelect={handleBookmarkSelect}
          filters={filters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          refreshKey={refreshKey}
        />
        {showSettings && (
          <Settings onClose={() => setShowSettings(false)} />
        )}
      </div>
    </>
  );
}

function App() {
  return (
    <IntlProvider messages={messages} locale="ar" defaultLocale="ar">
      <AppContent />
    </IntlProvider>
  );
}

export default App;
