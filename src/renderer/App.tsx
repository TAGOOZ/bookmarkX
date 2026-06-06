import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { IntlProvider, useIntl } from 'react-intl';
import NavPanel from './components/NavPanel';
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

const messages = {
  appName: 'بوكماركس',
  bookmarks: 'الإشارات المرجعية',
  settings: 'الإعدادات',
  search: 'بحث...',
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
  userProfile: 'الملف الشخصي',
  name: 'الاسم',
  namePlaceholder: 'اسمك',
  twitterHandle: 'حساب تويتر',
  twitterHandlePlaceholder: '@اسم المستخدم',
  xAuth: 'مصادقة X/Twitter',
  authTokenPlaceholder: 'أدخل auth_token',
  ct0Placeholder: 'أدخل ct0 cookie',
  chromeProfilePlaceholder: 'اسم ملف Chrome الشخصي',
  geminiApi: 'مفتاح Gemini API',
  apiKeyPlaceholder: 'أدخل مفتاح Gemini API',
  preferences: 'التفضيلات',
  theme: 'المظهر',
  language: 'اللغة',
  notifications: 'الإشعارات',
  fetchFrequency: 'تكرار الجلب',
  aiModel: 'نموذج الذكاء الاصطناعي',
  loginWithTwitter: 'تسجيل الدخول بحساب تويتر',
  loggingIn: 'جاري تسجيل الدخول...',
  detectedFromChrome: 'تم الكشف من Chrome',
  or: 'أو',
  detect: 'كشف',
  enteredManually: 'أُدخل يدوياً',
  dark: 'داكن',
  light: 'فاتح',
  every3Hours: 'كل 3 ساعات',
  every6Hours: 'كل 6 ساعات',
  every12Hours: 'كل 12 ساعة',
  daily: 'يومياً',
  loading: 'جاري التحميل...',
  errorOccurred: 'حدث خطأ',
  missingCredentials: 'بيانات اعتماد X/Twitter مفقودة. افتح الإعدادات وقم بـ:\n• النقر على "تسجيل الدخول بحساب تويتر" للمصادقة، أو\n• إدخال auth_token و ct0 يدوياً من أدوات مطور Chrome',
  تكنولوجيا: 'تكنولوجيا',
  تصميم: 'تصميم',
  أعمال: 'أعمال',
  علوم: 'علوم',
  مقال: 'مقال',
  فيديو: 'فيديو',
  صورة: 'صورة',
  رابط: 'رابط',
};

function AppContent() {
  const { locale } = useIntl();
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const [openBookmarks, setOpenBookmarks] = useState<Bookmark[]>([]);
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
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

  const handleFetch = useCallback(async () => {
    await window.api.fetchBookmarks();
    setRefreshKey((k) => k + 1);
  }, []);

  const handleClassify = useCallback(async () => {
    await window.api.classifyAndNotify();
    setRefreshKey((k) => k + 1);
  }, []);

  const fetchBookmarks = useCallback(async () => {
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
        return {
          id: dbBookmark.id,
          title: dbBookmark.title || dbBookmark.tweet_text || 'Untitled',
          url: dbBookmark.url,
          topic: classification?.priority || 'medium',
          priority:
            (classification?.priority as 'high' | 'medium' | 'low') || 'medium',
          contentType: dbBookmark.content_type,
          content: dbBookmark.tweet_text || '',
          createdAt: dbBookmark.fetched_at,
        };
      });

      setBookmarks(mappedBookmarks);
    } catch {
      setBookmarks([]);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [refreshKey]);

  return (
    <>
      <div className="titlebar">bookmarkx</div>
      <div className="app-container">
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
          <BookmarkDetail bookmark={activeBookmark} />
        </div>
        <NavPanel
          bookmarks={bookmarks}
          onSettingsClick={() => setShowSettings(true)}
          onFetchClick={handleFetch}
          onClassifyClick={handleClassify}
          onSelectBookmark={handleBookmarkSelect}
          selectedBookmarkId={activeBookmarkId}
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
