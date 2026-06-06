/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import BookmarkDetail from '../BookmarkDetail';

afterEach(() => { cleanup(); });

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const messages = { selectBookmark: 'Select a bookmark' };

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en" messages={messages}>{ui}</IntlProvider>);

const baseBookmark = {
  id: '1',
  title: 'Test Article',
  url: 'https://example.com',
  topic: 'technology',
  priority: 'high' as const,
  contentType: 'article',
  content: 'Article body text here.',
  createdAt: new Date(Date.now() - 3600000).toISOString(),
};

describe('BookmarkDetail', () => {
  it('shows empty state when no bookmark', () => {
    renderWithIntl(<BookmarkDetail bookmark={null} />);
    expect(screen.getByText('Select a bookmark')).toBeDefined();
  });

  it('renders page header with title', () => {
    renderWithIntl(<BookmarkDetail bookmark={baseBookmark} />);
    expect(screen.getByText('Test Article')).toBeDefined();
  });

  it('renders article content', () => {
    renderWithIntl(<BookmarkDetail bookmark={baseBookmark} />);
    expect(screen.getByText('Article body text here.')).toBeDefined();
  });

  it('hides summary section when no summary provided', () => {
    renderWithIntl(<BookmarkDetail bookmark={baseBookmark} />);
    expect(screen.queryByText('Summary')).toBeNull();
  });

  it('shows summary when provided', () => {
    renderWithIntl(
      <BookmarkDetail
        bookmark={{ ...baseBookmark, summary: 'AI summary text', summaryAr: 'ملخص بالعربي' }}
      />,
    );
    expect(screen.getByText('Summary')).toBeDefined();
    expect(screen.getByText('ملخص بالعربي')).toBeDefined();
  });

  it('shows glossary when terms provided', () => {
    renderWithIntl(
      <BookmarkDetail
        bookmark={{
          ...baseBookmark,
          glossaryTerms: [{ term: 'API', definition: 'Application Programming Interface' }],
        }}
      />,
    );
    expect(screen.getByText('Glossary')).toBeDefined();
    expect(screen.getByText('API')).toBeDefined();
  });

  it('renders layout mode buttons', () => {
    renderWithIntl(<BookmarkDetail bookmark={baseBookmark} />);
    expect(screen.getByText('Linear')).toBeDefined();
    expect(screen.getByText('Two Column')).toBeDefined();
    expect(screen.getByText('Collapsible')).toBeDefined();
  });

  it('switches layout mode on click', async () => {
    const user = userEvent.setup();
    renderWithIntl(<BookmarkDetail bookmark={baseBookmark} />);
    await user.click(screen.getByText('Two Column'));
    expect(screen.getByText('Two Column').closest('button')?.className).toContain('layoutActive');
  });
});
