/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import BookmarkList from '../components/BookmarkList';
import { FilterState } from '../App';

const messages = {
  bookmarks: 'Bookmarks',
  noBookmarks: 'No bookmarks',
  noBookmarksDescription: 'No bookmarks found',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
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
  };
});

afterEach(() => {
  cleanup();
});

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en" messages={messages}>{ui}</IntlProvider>);

describe('BookmarkList error handling', () => {
  it('falls back to mock data when fetch fails', async () => {
    window.api.getBookmarks.mockRejectedValue(new Error('Network error'));
    window.api.getClassifications.mockResolvedValue([]);

    renderWithIntl(
      <BookmarkList
        selectedBookmark={null}
        onBookmarkSelect={vi.fn()}
        filters={defaultFilters}
        searchQuery=""
        onSearchChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Introducing Command A+: Making sovereign agentic capabilities available to all')).toBeDefined();
    });
  });

  it('falls back to mock data when classifications fail', async () => {
    window.api.getBookmarks.mockResolvedValue([]);
    window.api.getClassifications.mockRejectedValue(new Error('DB error'));

    renderWithIntl(
      <BookmarkList
        selectedBookmark={null}
        onBookmarkSelect={vi.fn()}
        filters={defaultFilters}
        searchQuery=""
        onSearchChange={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Introducing Command A+: Making sovereign agentic capabilities available to all')).toBeDefined();
    });
  });
});
