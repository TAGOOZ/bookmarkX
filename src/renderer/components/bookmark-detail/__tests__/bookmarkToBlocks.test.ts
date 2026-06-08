import { describe, it, expect } from 'vitest';
import { bookmarkToBlocks } from '../bookmarkToBlocks';
import type { BookmarkDetailData } from '../types';

function baseBookmark(overrides: Partial<BookmarkDetailData> = {}): BookmarkDetailData {
  return {
    id: '1',
    title: 'Test Bookmark',
    titleAr: null,
    titleEn: null,
    url: 'https://example.com',
    topic: '',
    priority: 'medium',
    contentType: 'outer_link',
    content: '',
    createdAt: '2025-01-15T10:00:00Z',
    ...overrides,
  };
}

describe('bookmarkToBlocks — article section', () => {
  it('creates articleReader block when articleBlocks is valid JSON array', () => {
    const articleBlocks = JSON.stringify([
      { type: 'heading', props: { level: 1 }, content: 'Intro' },
      { type: 'paragraph', content: 'Hello world' },
    ]);
    const bookmark = baseBookmark({ articleBlocks, articleWordCount: 50, articleReadingTime: 3, url: 'https://example.com' });
    const blocks = bookmarkToBlocks(bookmark);

    const articleHeading = blocks.find(
      (b) => b.type === 'heading' && (b as any).props?.level === 2 && (b as any).content === 'Article'
    );
    expect(articleHeading).toBeDefined();

    const readerBlock = blocks.find((b) => (b as any).type === 'articleReader');
    expect(readerBlock).toBeDefined();
    expect((readerBlock as any).props.blocksJson).toBe(articleBlocks);
    expect((readerBlock as any).props.wordCount).toBe(50);
    expect((readerBlock as any).props.readingTime).toBe(3);
    expect((readerBlock as any).props.sourceUrl).toBe('https://example.com');
    expect((readerBlock as any).props.isExpanded).toBe(false);
  });

  it('falls back to collapsibleArticle when articleBlocks is invalid JSON', () => {
    const bookmark = baseBookmark({
      articleBlocks: 'not valid json{{{',
      content: 'Some raw content here',
    });
    const blocks = bookmarkToBlocks(bookmark);

    const readerBlock = blocks.find((b) => (b as any).type === 'articleReader');
    expect(readerBlock).toBeUndefined();

    const fallbackBlock = blocks.find((b) => (b as any).type === 'collapsibleArticle');
    expect(fallbackBlock).toBeDefined();
    expect((fallbackBlock as any).props.content).toBe('Some raw content here');
  });

  it('falls back to collapsibleArticle when articleBlocks is empty array', () => {
    const bookmark = baseBookmark({
      articleBlocks: '[]',
      content: 'Fallback content',
    });
    const blocks = bookmarkToBlocks(bookmark);

    const readerBlock = blocks.find((b) => (b as any).type === 'articleReader');
    expect(readerBlock).toBeUndefined();

    const fallbackBlock = blocks.find((b) => (b as any).type === 'collapsibleArticle');
    expect(fallbackBlock).toBeDefined();
    expect((fallbackBlock as any).props.content).toBe('Fallback content');
  });

  it('falls back to collapsibleArticle when no articleBlocks but content exists', () => {
    const bookmark = baseBookmark({
      content: 'Plain text content for the article',
    });
    const blocks = bookmarkToBlocks(bookmark);

    const readerBlock = blocks.find((b) => (b as any).type === 'articleReader');
    expect(readerBlock).toBeUndefined();

    const fallbackBlock = blocks.find((b) => (b as any).type === 'collapsibleArticle');
    expect(fallbackBlock).toBeDefined();
    expect((fallbackBlock as any).props.content).toBe('Plain text content for the article');
    expect((fallbackBlock as any).props.isExpanded).toBe(false);
  });

  it('falls back to collapsibleArticle when articleBlocks is non-array JSON', () => {
    const bookmark = baseBookmark({
      articleBlocks: JSON.stringify({ not: 'an array' }),
      content: 'Backup',
    });
    const blocks = bookmarkToBlocks(bookmark);

    const readerBlock = blocks.find((b) => (b as any).type === 'articleReader');
    expect(readerBlock).toBeUndefined();

    const fallbackBlock = blocks.find((b) => (b as any).type === 'collapsibleArticle');
    expect(fallbackBlock).toBeDefined();
  });

  it('adds no article section when no articleBlocks and no content', () => {
    const bookmark = baseBookmark({
      articleBlocks: undefined,
      content: '',
    });
    const blocks = bookmarkToBlocks(bookmark);

    const articleHeading = blocks.find(
      (b) => b.type === 'heading' && (b as any).content === 'Article'
    );
    expect(articleHeading).toBeUndefined();
  });

  it('calculates wordCount from content for fallback', () => {
    const content = 'one two three four five';
    const bookmark = baseBookmark({ content });
    const blocks = bookmarkToBlocks(bookmark);

    const fallbackBlock = blocks.find((b) => (b as any).type === 'collapsibleArticle');
    expect((fallbackBlock as any).props.wordCount).toBe(5);
  });
});
