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
  appName: 'BookmarkX',
  bookmarks: 'Bookmarks',
  settings: 'Settings',
  fetchNow: 'Fetch Now',
  priority: 'Priority',
  topics: 'Topics',
  contentTypes: 'Content Types',
  all: 'All',
  allTopics: 'All Topics',
  allTypes: 'All Types',
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
  };
});

afterEach(() => {
  cleanup();
});

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en" messages={messages}>{ui}</IntlProvider>);

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

    expect(screen.getByText('Fetch Now')).toBeDefined();
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

    await userEvent.click(screen.getByText('Fetch Now'));
    expect(onFetchClick).toHaveBeenCalledTimes(1);
  });
});
