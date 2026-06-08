/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import BookmarkDetail from '../components/bookmark-detail/BookmarkDetail';

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

const messages = {
  selectBookmark: 'Select a bookmark',
  article: 'Article',
  words: 'words',
  minRead: 'min read',
  noArticleContent: 'No article content',
  enhanced: 'Enhanced:',
  dismissEnhanced: 'Dismiss enhanced text',
  parsingArticle: 'Parsing article...',
  parseErrorTitle: 'Failed to parse article',
  retry: 'Retry',
  summary: 'Summary',
  glossary: 'Glossary',
  highlights: 'Highlights',
  notes: 'Notes',
  chat: 'Chat',
};

const mockExtractArticle = vi.fn();
const mockGetArticleContent = vi.fn();
const mockCreateChatSession = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
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
    extractArticle: mockExtractArticle,
    getArticleContent: mockGetArticleContent,
    sendChatMessage: vi.fn(),
    createChatSession: mockCreateChatSession,
    getChatMessages: vi.fn(),
    saveHighlight: vi.fn(),
    getHighlights: vi.fn(),
    saveNote: vi.fn(),
    getNotes: vi.fn(),
    addGlossaryTerm: vi.fn(),
    searchGlossary: vi.fn(),
    generateGlossary: vi.fn(),
    enhanceNote: vi.fn(),
    searchArticles: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
});

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en" messages={messages}>{ui}</IntlProvider>);

const createMockBookmark = (overrides: Record<string, unknown> = {}) => ({
  id: 'test-bookmark-1',
  tweet_id: '123456789',
  url: 'https://example.com/article',
  content_type: 'outer_link' as const,
  title: 'Test Article',
  title_ar: null,
  title_en: 'Test Article',
  author_name: 'Test Author',
  author_handle: '@testauthor',
  tweet_text: 'Check out this article',
  fetched_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('BookmarkDetail Error UI', () => {
  it('shows error banner when extraction fails', async () => {
    mockExtractArticle.mockRejectedValue(new Error('Network error'));
    mockGetArticleContent.mockResolvedValue(null);
    mockCreateChatSession.mockResolvedValue('session-1');

    const bookmark = createMockBookmark();
    renderWithIntl(<BookmarkDetail bookmark={bookmark as any} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to parse article')).toBeDefined();
    });

    expect(screen.getByText('Network error')).toBeDefined();
    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('retry button triggers re-extraction', async () => {
    mockExtractArticle
      .mockRejectedValueOnce(new Error('First attempt failed'))
      .mockResolvedValueOnce({
        blocks_json: JSON.stringify([
          { type: 'heading', props: { level: 2 }, content: 'Article Content' },
        ]),
        word_count: 100,
        reading_time: 1,
      });
    mockGetArticleContent.mockResolvedValue(null);
    mockCreateChatSession.mockResolvedValue('session-1');

    const bookmark = createMockBookmark();
    renderWithIntl(<BookmarkDetail bookmark={bookmark as any} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to parse article')).toBeDefined();
    });

    const retryButton = screen.getByText('Retry');
    retryButton.click();

    await waitFor(() => {
      expect(mockExtractArticle).toHaveBeenCalledTimes(2);
    });

    expect(screen.queryByText('Failed to parse article')).toBeNull();
  });

  it('does not show error banner when extraction succeeds', async () => {
    mockExtractArticle.mockResolvedValue({
      blocks_json: JSON.stringify([
        { type: 'heading', props: { level: 2 }, content: 'Article Content' },
      ]),
      word_count: 100,
      reading_time: 1,
    });
    mockGetArticleContent.mockResolvedValue(null);
    mockCreateChatSession.mockResolvedValue('session-1');

    const bookmark = createMockBookmark();
    renderWithIntl(<BookmarkDetail bookmark={bookmark as any} />);

    await waitFor(() => {
      expect(mockExtractArticle).toHaveBeenCalled();
    });

    expect(screen.queryByText('Failed to parse article')).toBeNull();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('does not attempt extraction when articleBlocks already exists', async () => {
    mockGetArticleContent.mockResolvedValue(null);
    mockCreateChatSession.mockResolvedValue('session-1');

    const bookmark = createMockBookmark({
      articleBlocks: JSON.stringify([
        { type: 'heading', props: { level: 2 }, content: 'Existing Content' },
      ]),
    });
    renderWithIntl(<BookmarkDetail bookmark={bookmark as any} />);

    await waitFor(() => {
      expect(mockCreateChatSession).toHaveBeenCalled();
    });

    expect(mockExtractArticle).not.toHaveBeenCalled();
  });
});

describe('BookmarkDetail Exports', () => {
  it('exports correctly', () => {
    expect(BookmarkDetail).toBeDefined();
    expect(typeof BookmarkDetail).toBe('function');
  });
});
