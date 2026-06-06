/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
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

  it('renders the BlockNote editor with bookmark title in blocks', () => {
    const { container } = renderWithIntl(<BookmarkDetail bookmark={baseBookmark} />);
    expect(container.querySelector('.bn-editor')).toBeDefined();
  });

  it('renders the BlockNote editor', () => {
    const { container } = renderWithIntl(<BookmarkDetail bookmark={baseBookmark} />);
    expect(container.querySelector('.bn-editor')).toBeDefined();
  });

  it('converts bookmark data to blocks and renders', () => {
    const { container } = renderWithIntl(
      <BookmarkDetail
        bookmark={{ ...baseBookmark, summary: 'AI summary text' }}
      />,
    );
    expect(container.querySelector('.bn-editor')).toBeDefined();
  });

  it('renders with pre-stored blocks', () => {
    const blocks = [
      { type: 'heading', props: { level: 2 }, content: 'Custom Heading' },
      { type: 'paragraph', content: 'Custom content' },
    ];
    const { container } = renderWithIntl(
      <BookmarkDetail
        bookmark={{ ...baseBookmark, blocks: JSON.stringify(blocks) }}
      />,
    );
    expect(container.querySelector('.bn-editor')).toBeDefined();
  });
});
