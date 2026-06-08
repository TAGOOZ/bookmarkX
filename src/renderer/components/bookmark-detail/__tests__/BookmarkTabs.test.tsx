/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import BookmarkTabs from '../BookmarkTabs';
import { LocaleContext } from '../../../App';

const messages = {
  closeTab: 'Close',
  closeAllTabs: 'Close All',
  closeTabsToRight: 'Close to Right',
  closeTabsToLeft: 'Close to Left',
  closeOtherTabs: 'Close Others',
  reopenClosedTab: 'Reopen Closed Tab',
};

afterEach(() => {
  cleanup();
});

const bookmarks: Array<{
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
  { id: '1', title: 'First Bookmark', titleAr: null, titleEn: 'First Bookmark', url: 'https://a.com', topic: 'tech', priority: 'high', contentType: 'article', content: '', createdAt: '' },
  { id: '2', title: 'Second Bookmark', titleAr: null, titleEn: 'Second Bookmark', url: 'https://b.com', topic: 'design', priority: 'medium', contentType: 'video', content: '', createdAt: '' },
  { id: '3', title: 'A Very Long Bookmark Title That Should Be Truncated Someday', titleAr: null, titleEn: 'A Very Long Bookmark Title That Should Be Truncated Someday', url: 'https://c.com', topic: 'science', priority: 'low', contentType: 'article', content: '', createdAt: '' },
];

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <IntlProvider locale="en" messages={messages}>
      <LocaleContext.Provider value={{ locale: 'en', setLocale: vi.fn() }}>
        {ui}
      </LocaleContext.Provider>
    </IntlProvider>
  );

describe('BookmarkTabs', () => {
  it('renders nothing when no open bookmarks', () => {
    const { container } = renderWithProviders(
      <BookmarkTabs openBookmarks={[]} activeBookmarkId={null} onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders tabs for open bookmarks', () => {
    renderWithProviders(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    expect(screen.getByText('First Bookmark')).toBeDefined();
    expect(screen.getByText('Second Bookmark')).toBeDefined();
  });

  it('truncates long titles beyond 32 chars', () => {
    renderWithProviders(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    const longTab = screen.getAllByRole('tab')[2];
    expect(longTab.textContent).toContain('A Very Long Bookmark Title');
    expect(longTab.textContent!.length).toBeLessThan(bookmarks[2].title.length);
  });

  it('calls onTabSelect when tab is clicked', async () => {
    const onTabSelect = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={onTabSelect} onTabClose={vi.fn()} />
    );
    await user.click(screen.getByText('Second Bookmark'));
    expect(onTabSelect).toHaveBeenCalledWith('2');
  });

  it('calls onTabClose when close button is clicked', async () => {
    const onTabClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={onTabClose} />
    );
    const closeButtons = screen.getAllByRole('button');
    await user.click(closeButtons[0]);
    expect(onTabClose).toHaveBeenCalledWith('1');
  });

  it('marks active tab with aria-selected', () => {
    renderWithProviders(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="2" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('applies active class to active tab', () => {
    renderWithProviders(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} />
    );
    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].className).toContain('active');
    expect(tabs[1].className).not.toContain('active');
  });

  it('applies rtl class when dir=rtl', () => {
    const { container } = renderWithProviders(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} dir="rtl" />
    );
    const tabBar = container.querySelector('[role="tablist"]');
    expect(tabBar?.className).toContain('rtl');
    expect(tabBar?.getAttribute('dir')).toBe('rtl');
  });

  it('does not apply rtl class when dir=ltr', () => {
    const { container } = renderWithProviders(
      <BookmarkTabs openBookmarks={bookmarks} activeBookmarkId="1" onTabSelect={vi.fn()} onTabClose={vi.fn()} dir="ltr" />
    );
    const tabBar = container.querySelector('[role="tablist"]');
    expect(tabBar?.className).not.toContain('rtl');
    expect(tabBar?.getAttribute('dir')).toBe('ltr');
  });
});
