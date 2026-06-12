/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import BookmarkDetail from '../components/bookmark-detail/BookmarkDetail';
import { renderWithIntl } from './test-utils';

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

beforeEach(() => {
  vi.resetAllMocks();
  window.api = {
    getBookmarks: vi.fn(),
    getClassifications: vi.fn(),
    getBookmarkWithClassification: vi.fn(),
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    detectChromeProfile: vi.fn(),
    twitterLogin: vi.fn(),
    fetchBookmarks: vi.fn(),
    classifyAndNotify: vi.fn(),
    summarizeBookmark: vi.fn(),
    extractArticle: vi.fn(),
    getArticleContent: vi.fn().mockResolvedValue(null),
    sendChatMessage: vi.fn(),
    createChatSession: vi.fn().mockResolvedValue('session-1'),
    getChatMessages: vi.fn().mockResolvedValue([]),
    saveHighlight: vi.fn(),
    getHighlights: vi.fn().mockResolvedValue([]),
    saveNote: vi.fn(),
    getNotes: vi.fn().mockResolvedValue([]),
    addGlossaryTerm: vi.fn(),
    searchGlossary: vi.fn(),
    generateGlossary: vi.fn(),
    enhanceNote: vi.fn(),
    searchArticles: vi.fn(),
    exportBookmark: vi.fn(),
    importMarkdown: vi.fn(),
    getTopicTree: vi.fn(),
    createTopic: vi.fn(),
    renameTopic: vi.fn(),
    reparentTopic: vi.fn(),
    deleteTopic: vi.fn(),
    moveBookmarkToTopic: vi.fn(),
    getAllHashtags: vi.fn(),
    getBookmarkHashtags: vi.fn().mockResolvedValue([]),
    attachHashtagToBookmark: vi.fn(),
    detachHashtagFromBookmark: vi.fn(),
    setBookmarkHashtags: vi.fn(),
    deleteHighlight: vi.fn(),
    deleteNote: vi.fn(),
    getAllGlossaryTerms: vi.fn(),
    deleteGlossaryTerm: vi.fn(),
    exportGlossary: vi.fn(),
    getCustomSections: vi.fn().mockResolvedValue([]),
    createCustomSection: vi.fn(),
    updateCustomSection: vi.fn(),
    deleteCustomSection: vi.fn(),
    reorderCustomSections: vi.fn(),
  } as any;
});

afterEach(() => {
  cleanup();
});

const createMockBookmark = (overrides: Record<string, unknown> = {}) => ({
  id: 'test-bookmark-1',
  tweet_id: '123456789',
  url: 'https://example.com/article',
  content_type: 'outer_link' as const,
  title: 'Test Article',
  title_ar: null as string | null,
  title_en: 'Test Article',
  author_name: 'Test Author',
  author_handle: '@testauthor',
  tweet_text: 'Check out this article',
  fetched_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('BookmarkDetail', () => {
  it('renders empty state when no bookmark', () => {
    renderWithIntl(<BookmarkDetail bookmark={null} />);
    expect(document.querySelector('[class*="empty"]')).toBeTruthy();
  });

  it('exports correctly', () => {
    expect(BookmarkDetail).toBeDefined();
    expect(typeof BookmarkDetail).toBe('function');
  });

  it('accepts bookmark prop without throwing', () => {
    const bookmark = createMockBookmark();
    expect(() => {
      renderWithIntl(<BookmarkDetail bookmark={bookmark as any} />);
    }).not.toThrow();
  });

  it('accepts onBlocksChange callback', () => {
    const bookmark = createMockBookmark();
    const onBlocksChange = vi.fn();
    expect(() => {
      renderWithIntl(
        <BookmarkDetail bookmark={bookmark as any} onBlocksChange={onBlocksChange} />
      );
    }).not.toThrow();
  });

  it('accepts onBookmarkChange callback', () => {
    const bookmark = createMockBookmark();
    const onBookmarkChange = vi.fn();
    expect(() => {
      renderWithIntl(
        <BookmarkDetail bookmark={bookmark as any} onBookmarkChange={onBookmarkChange} />
      );
    }).not.toThrow();
  });

  it('does not call extractArticle on mount', () => {
    const mockExtract = window.api.extractArticle as ReturnType<typeof vi.fn>;
    const bookmark = createMockBookmark();
    renderWithIntl(<BookmarkDetail bookmark={bookmark as any} />);
    expect(mockExtract).not.toHaveBeenCalled();
  });

  it('does not call createChatSession on mount', () => {
    const mockCreate = window.api.createChatSession as ReturnType<typeof vi.fn>;
    const bookmark = createMockBookmark();
    renderWithIntl(<BookmarkDetail bookmark={bookmark as any} />);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
