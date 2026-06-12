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
  titleAr: null as string | null,
  titleEn: 'Test Article',
  url: 'https://example.com',
  topic: 'technology',
  priority: 'high' as const,
  contentType: 'article',
  content: 'Article body text here.',
  createdAt: new Date(Date.now() - 3600000).toISOString(),
};

describe('BookmarkDetail', () => {
  describe('empty state', () => {
    it('shows empty state when no bookmark', () => {
      renderWithIntl(<BookmarkDetail bookmark={null} />);
      expect(screen.getByText('Select a bookmark')).toBeDefined();
    });
  });

  describe('editor rendering', () => {
    it('renders BlockNote editor for a bookmark', () => {
      const { container } = renderWithIntl(<BookmarkDetail bookmark={baseBookmark} />);
      expect(container.querySelector('.bn-editor')).not.toBeNull();
    });

    it('renders editor only once (no duplicate editors)', () => {
      const { container } = renderWithIntl(<BookmarkDetail bookmark={baseBookmark} />);
      const editors = container.querySelectorAll('.bn-editor');
      expect(editors).toHaveLength(1);
    });
  });

  describe('content scenarios', () => {
    it('renders editor with summary', () => {
      const { container } = renderWithIntl(
        <BookmarkDetail
          bookmark={{ ...baseBookmark, summary: 'AI summary text' }}
        />,
      );
      expect(container.querySelector('.bn-editor')).not.toBeNull();
    });

    it('renders editor with pre-stored blocks', () => {
      const blocks = [
        { type: 'heading', props: { level: 2 }, content: 'Custom Heading' },
        { type: 'paragraph', content: 'Custom content' },
      ];
      const { container } = renderWithIntl(
        <BookmarkDetail
          bookmark={{ ...baseBookmark, blocks: JSON.stringify(blocks) }}
        />,
      );
      expect(container.querySelector('.bn-editor')).not.toBeNull();
    });

    it('renders editor with null content', () => {
      const { container } = renderWithIntl(
        <BookmarkDetail
          bookmark={{ ...baseBookmark, content: null }}
        />,
      );
      expect(container.querySelector('.bn-editor')).not.toBeNull();
    });

    it('renders editor with empty content', () => {
      const { container } = renderWithIntl(
        <BookmarkDetail
          bookmark={{ ...baseBookmark, content: '' }}
        />,
      );
      expect(container.querySelector('.bn-editor')).not.toBeNull();
    });

    it('renders editor with very long title', () => {
      const longTitle = 'A'.repeat(500);
      const { container } = renderWithIntl(
        <BookmarkDetail
          bookmark={{ ...baseBookmark, title: longTitle }}
        />,
      );
      expect(container.querySelector('.bn-editor')).not.toBeNull();
    });
  });

  describe('RTL detection', () => {
    it('sets dir="rtl" for Arabic bookmark', () => {
      const { container } = renderWithIntl(
        <BookmarkDetail
          bookmark={{ ...baseBookmark, title: 'مقال عن الذكاء الاصطناعي' }}
        />,
      );
      expect(container.querySelector('[dir="rtl"]')).not.toBeNull();
    });

    it('sets dir="ltr" for English bookmark', () => {
      const { container } = renderWithIntl(
        <BookmarkDetail bookmark={baseBookmark} />
      );
      expect(container.querySelector('[dir="ltr"]')).not.toBeNull();
    });

    it('sets dir="rtl" when summary is Arabic', () => {
      const { container } = renderWithIntl(
        <BookmarkDetail
          bookmark={{ ...baseBookmark, summary: 'ملخص بالعربي' }}
        />,
      );
      expect(container.querySelector('[dir="rtl"]')).not.toBeNull();
    });

    it('does not set dir="rtl" for English content', () => {
      const { container } = renderWithIntl(
        <BookmarkDetail bookmark={baseBookmark} />
      );
      expect(container.querySelector('[dir="rtl"]')).toBeNull();
    });
  });
});
