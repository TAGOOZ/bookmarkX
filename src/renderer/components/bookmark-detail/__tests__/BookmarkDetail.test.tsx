/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import BookmarkDetail from '../BookmarkDetail';
import { renderWithIntl } from '../../../__tests__/test-utils';

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

const baseBookmark = {
  id: '1',
  title: 'Test Article',
  titleAr: null,
  titleEn: 'Test Article',
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

  it('sets dir="rtl" on editor for Arabic bookmark', () => {
    const { container } = renderWithIntl(
      <BookmarkDetail
        bookmark={{ ...baseBookmark, title: 'مقال عن الذكاء الاصطناعي' }}
      />,
    );
    const editor = container.querySelector('[dir="rtl"]');
    expect(editor).not.toBeNull();
  });

  it('sets dir="ltr" on editor for English bookmark', () => {
    const { container } = renderWithIntl(
      <BookmarkDetail bookmark={baseBookmark} />
    );
    const editor = container.querySelector('[dir="ltr"]');
    expect(editor).not.toBeNull();
  });

  it('sets dir="rtl" when summary is Arabic', () => {
    const { container } = renderWithIntl(
      <BookmarkDetail
        bookmark={{ ...baseBookmark, summary: 'ملخص بالعربي' }}
      />,
    );
    const editor = container.querySelector('[dir="rtl"]');
    expect(editor).not.toBeNull();
  });
});
