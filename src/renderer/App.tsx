import React, { useState, useCallback } from 'react';
import { IntlProvider } from 'react-intl';
import Sidebar from './components/Sidebar';
import BookmarkList from './components/BookmarkList';
import BookmarkDetail from './components/BookmarkDetail';
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
  appName: 'BookmarkX',
  bookmarks: 'الإشارات المرجعية',
  settings: 'الإعدادات',
  search: 'بحث...',
  all: 'الكل',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
  allTopics: 'جميع المواضيع',
  allTypes: 'جميع الأنواع',
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

  return (
    <IntlProvider messages={messages} locale="ar" defaultLocale="ar">
      <div className="app-container">
        <Sidebar
          onSettingsClick={() => setShowSettings(true)}
          filters={filters}
          onFilterChange={handleFilterChange}
          onFetchClick={handleFetch}
        />
        <BookmarkList
          selectedBookmark={selectedBookmark}
          onBookmarkSelect={handleBookmarkSelect}
          filters={filters}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          refreshKey={refreshKey}
        />
        <BookmarkDetail bookmark={selectedBookmark} />
        {showSettings && (
          <Settings onClose={() => setShowSettings(false)} />
        )}
      </div>
    </IntlProvider>
  );
}

export default App;
