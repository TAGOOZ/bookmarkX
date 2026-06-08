/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import NavPanel from '../components/NavPanel';

const messages = {
  appName: 'بوكماركس',
  bookmarks: 'الإشارات المرجعية',
  settings: 'الإعدادات',
  fetchNow: 'جلب الآن',
  classifyNow: 'تصنيف الآن',
  searchTooltip: 'بحث',
  fetchNowTooltip: 'جلب الآن',
  classifyNowTooltip: 'تصنيف الآن',
  mockModeTooltip: 'وضع التجريب',
  stopMockModeTooltip: 'إيقاف وضع التجريب',
  settingsTooltip: 'الإعدادات',
  noBookmarks: 'لا توجد إشارات مرجعية',
  collapseNav: 'طي الشريط الجانبي',
  expandNav: 'توسيع الشريط الجانبي',
  تكنولوجيا: 'تكنولوجيا',
  تصميم: 'تصميم',
  أعمال: 'أعمال',
  علوم: 'علوم',
};

const mockBookmarks: Array<{
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
}> = [
  {
    id: '1',
    title: 'Test Bookmark',
    titleAr: null,
    titleEn: 'Test Bookmark',
    url: 'https://example.com',
    topic: 'تكنولوجيا',
    priority: 'high',
    contentType: 'article',
    content: 'Test content',
    createdAt: '2024-01-01',
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  window.api = {
    getBookmarks: vi.fn(),
    getClassifications: vi.fn(),
    getBookmarkWithClassification: vi.fn(),
    getSettings: vi.fn().mockResolvedValue({ name: '', twitterHandle: '', geminiApiKey: '', birdAuthToken: '', birdCt0: '', birdChromeProfile: '', theme: 'dark', language: 'ar', notifications: true, fetchFrequency: '0 */6 * * *', aiModel: 'gemini-2.0-flash' }),
    saveSettings: vi.fn(),
    fetchBookmarks: vi.fn(),
    classifyAndNotify: vi.fn(),
    detectChromeProfile: vi.fn(),
    twitterLogin: vi.fn(),
    summarizeBookmark: vi.fn(),
    extractArticle: vi.fn(),
    getArticleContent: vi.fn(),
    sendChatMessage: vi.fn(),
    createChatSession: vi.fn(),
    getChatMessages: vi.fn(),
    saveHighlight: vi.fn(),
    getHighlights: vi.fn(),
    saveNote: vi.fn(),
    getNotes: vi.fn(),
    addGlossaryTerm: vi.fn(),
    searchGlossary: vi.fn(),
    generateGlossary: vi.fn(),
    enhanceNote: vi.fn(),
    exportBookmark: vi.fn(),
    importMarkdown: vi.fn(),
    getTopicTree: vi.fn().mockResolvedValue([]),
    createTopic: vi.fn(),
    renameTopic: vi.fn(),
    reparentTopic: vi.fn(),
    deleteTopic: vi.fn(),
    moveBookmarkToTopic: vi.fn(),
    getAllHashtags: vi.fn(),
    getBookmarkHashtags: vi.fn(),
    attachHashtagToBookmark: vi.fn(),
    detachHashtagFromBookmark: vi.fn(),
    setBookmarkHashtags: vi.fn(),
    searchArticles: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
});

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="ar" messages={messages}>{ui}</IntlProvider>);

describe('NavPanel', () => {
  it('shows action buttons', () => {
    renderWithIntl(
      <NavPanel
        bookmarks={mockBookmarks}
        onSettingsClick={vi.fn()}
        onFetchClick={vi.fn()}
        onClassifyClick={vi.fn()}
        onSelectBookmark={vi.fn()}
        selectedBookmarkId={null}
        mockMode={false}
        onToggleMockMode={vi.fn()}
      />
    );

    expect(screen.getByTitle('جلب الآن')).toBeDefined();
    expect(screen.getByTitle('تصنيف الآن')).toBeDefined();
    expect(screen.getByTitle('الإعدادات')).toBeDefined();
    expect(screen.getByTitle('بحث')).toBeDefined();
    expect(screen.getByTitle('وضع التجريب')).toBeDefined();
  });

  it('calls onFetchClick when fetch button is clicked', async () => {
    const onFetchClick = vi.fn();
    renderWithIntl(
      <NavPanel
        bookmarks={mockBookmarks}
        onSettingsClick={vi.fn()}
        onFetchClick={onFetchClick}
        onClassifyClick={vi.fn()}
        onSelectBookmark={vi.fn()}
        selectedBookmarkId={null}
        mockMode={false}
        onToggleMockMode={vi.fn()}
      />
    );

    await userEvent.click(screen.getByTitle('جلب الآن'));
    expect(onFetchClick).toHaveBeenCalledTimes(1);
  });

  it('calls onClassifyClick when classify button is clicked', async () => {
    const onClassifyClick = vi.fn();
    renderWithIntl(
      <NavPanel
        bookmarks={mockBookmarks}
        onSettingsClick={vi.fn()}
        onFetchClick={vi.fn()}
        onClassifyClick={onClassifyClick}
        onSelectBookmark={vi.fn()}
        selectedBookmarkId={null}
        mockMode={false}
        onToggleMockMode={vi.fn()}
      />
    );

    await userEvent.click(screen.getByTitle('تصنيف الآن'));
    expect(onClassifyClick).toHaveBeenCalledTimes(1);
  });

  it('calls onSettingsClick when settings button is clicked', async () => {
    const onSettingsClick = vi.fn();
    renderWithIntl(
      <NavPanel
        bookmarks={mockBookmarks}
        onSettingsClick={onSettingsClick}
        onFetchClick={vi.fn()}
        onClassifyClick={vi.fn()}
        onSelectBookmark={vi.fn()}
        selectedBookmarkId={null}
        mockMode={false}
        onToggleMockMode={vi.fn()}
      />
    );

    await userEvent.click(screen.getByTitle('الإعدادات'));
    expect(onSettingsClick).toHaveBeenCalledTimes(1);
  });

  it('displays bookmark grouped by topic', () => {
    renderWithIntl(
      <NavPanel
        bookmarks={mockBookmarks}
        onSettingsClick={vi.fn()}
        onFetchClick={vi.fn()}
        onClassifyClick={vi.fn()}
        onSelectBookmark={vi.fn()}
        selectedBookmarkId={null}
        mockMode={false}
        onToggleMockMode={vi.fn()}
      />
    );

    expect(screen.getByText('تكنولوجيا')).toBeDefined();
    expect(screen.getByText('Test Bookmark')).toBeDefined();
  });

  it('hides fetch and classify buttons in mock mode', () => {
    renderWithIntl(
      <NavPanel
        bookmarks={mockBookmarks}
        onSettingsClick={vi.fn()}
        onFetchClick={vi.fn()}
        onClassifyClick={vi.fn()}
        onSelectBookmark={vi.fn()}
        selectedBookmarkId={null}
        mockMode={true}
        onToggleMockMode={vi.fn()}
      />
    );

    expect(screen.queryByTitle('جلب الآن')).toBeNull();
    expect(screen.queryByTitle('تصنيف الآن')).toBeNull();
    expect(screen.getByTitle('إيقاف وضع التجريب')).toBeDefined();
  });

  it('calls onToggleMockMode when mock mode button is clicked', async () => {
    const onToggleMockMode = vi.fn();
    renderWithIntl(
      <NavPanel
        bookmarks={mockBookmarks}
        onSettingsClick={vi.fn()}
        onFetchClick={vi.fn()}
        onClassifyClick={vi.fn()}
        onSelectBookmark={vi.fn()}
        selectedBookmarkId={null}
        mockMode={false}
        onToggleMockMode={onToggleMockMode}
      />
    );

    await userEvent.click(screen.getByTitle('وضع التجريب'));
    expect(onToggleMockMode).toHaveBeenCalledTimes(1);
  });
});
