import React, { useState, useCallback } from 'react';
import { IntlProvider } from 'react-intl';
import Sidebar from './components/Sidebar';
import BookmarkList from './components/BookmarkList';
import BookmarkDetail from './components/bookmark-detail/BookmarkDetail';
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

function App() {
  const [selectedBookmark, setSelectedBookmark] = useState<Bookmark | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    priority: '',
    topic: '',
    contentType: '',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleBookmarkSelect = (bookmark: Bookmark) => {
    setSelectedBookmark(bookmark);
  };

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
    <IntlProvider messages={messages} locale="ar" defaultLocale="ar">
      <div className="titlebar" />
      <div className="app-container">
        <Sidebar
          onSettingsClick={() => setShowSettings(true)}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFetchClick={handleFetch}
          onClassifyClick={handleClassify}
        />
        <BookmarkDetail bookmark={selectedBookmark} />
        <BookmarkList
          selectedBookmark={selectedBookmark}
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
    </IntlProvider>
  );
}

export default App;
