/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import Sidebar from '../components/Sidebar';
import { FilterState } from '../App';

const messages = {
  appName: 'بوكماركس',
  bookmarks: 'الإشارات المرجعية',
  settings: 'الإعدادات',
  fetchNow: 'جلب الآن',
  classifyNow: 'تصنيف الآن',
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
};

const defaultFilters: FilterState = { priority: '', topic: '', contentType: '' };

beforeEach(() => {
  vi.clearAllMocks();
  window.api = {
    getBookmarks: vi.fn(),
    getClassifications: vi.fn(),
    getBookmarkWithClassification: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    fetchBookmarks: vi.fn(),
    classifyAndNotify: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
});

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="ar" messages={messages}>{ui}</IntlProvider>);

describe('Fetch trigger', () => {
  it('shows Fetch Now button in sidebar', () => {
    renderWithIntl(
      <Sidebar
        onSettingsClick={vi.fn()}
        filters={defaultFilters}
        onFilterChange={vi.fn()}
        onFetchClick={vi.fn()}
      />
    );

    expect(screen.getByText('جلب الآن')).toBeDefined();
  });

  it('calls onFetchClick when button is clicked', async () => {
    const onFetchClick = vi.fn();
    renderWithIntl(
      <Sidebar
        onSettingsClick={vi.fn()}
        filters={defaultFilters}
        onFilterChange={vi.fn()}
        onFetchClick={onFetchClick}
      />
    );

    await userEvent.click(screen.getByText('جلب الآن'));
    expect(onFetchClick).toHaveBeenCalledTimes(1);
  });
});
