/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, fireEvent, cleanup } from '@testing-library/react';
import TopicGroup from '../TopicGroup';
import type { Bookmark } from '../../types';
import { renderWithIntl } from '../../__tests__/test-utils';

afterEach(() => {
  cleanup();
});

const createBookmark = (id: string, title: string): Bookmark => ({
  id,
  title,
  titleAr: null,
  titleEn: null,
  url: `https://example.com/${id}`,
  topic: 'Test Topic',
  priority: 'medium',
  contentType: 'outer_link',
  content: '',
  createdAt: new Date().toISOString(),
});

describe('TopicGroup', () => {
  const defaultProps = {
    topic: 'Test Topic',
    bookmarks: [] as Bookmark[],
    isExpanded: true,
    onToggle: vi.fn(),
    onSelectBookmark: vi.fn(),
    selectedBookmarkId: null as string | null,
  };

  it('renders topic name', () => {
    const bookmarks = [createBookmark('1', 'Bookmark 1')];
    renderWithIntl(<TopicGroup {...defaultProps} bookmarks={bookmarks} />);
    expect(screen.getByText('Test Topic')).toBeDefined();
  });

  it('shows limited bookmarks when maxVisible is set', () => {
    const bookmarks = Array.from({ length: 10 }, (_, i) =>
      createBookmark(String(i), `Bookmark ${i}`)
    );
    renderWithIntl(
      <TopicGroup {...defaultProps} bookmarks={bookmarks} maxVisible={3} />
    );
    expect(screen.getByText('Bookmark 0')).toBeDefined();
    expect(screen.getByText('Bookmark 2')).toBeDefined();
    expect(screen.queryByText('Bookmark 3')).toBeNull();
  });

  it('shows all bookmarks when showMore is clicked', () => {
    const bookmarks = Array.from({ length: 10 }, (_, i) =>
      createBookmark(String(i), `Bookmark ${i}`)
    );
    const { container } = renderWithIntl(
      <TopicGroup {...defaultProps} bookmarks={bookmarks} maxVisible={3} />
    );
    const showMoreBtn = container.querySelector('.topic-show-more');
    expect(showMoreBtn).toBeDefined();
    fireEvent.click(showMoreBtn!);
    expect(screen.getByText('Bookmark 9')).toBeDefined();
  });

  it('uses virtualization for large lists when showAll is toggled', () => {
    const bookmarks = Array.from({ length: 100 }, (_, i) =>
      createBookmark(String(i), `Bookmark ${i}`)
    );
    const { container } = renderWithIntl(
      <TopicGroup
        {...defaultProps}
        bookmarks={bookmarks}
        maxVisible={3}
        isExpanded={true}
      />
    );
    expect(container.querySelector('.topic-group-virtual-list')).toBeNull();

    const showMoreBtn = container.querySelector('.topic-show-more');
    expect(showMoreBtn).toBeDefined();
    fireEvent.click(showMoreBtn!);
    expect(container.querySelector('.topic-group-virtual-list')).toBeDefined();
  });

  it('does not use virtualization for small lists', () => {
    const bookmarks = Array.from({ length: 10 }, (_, i) =>
      createBookmark(String(i), `Bookmark ${i}`)
    );
    const { container } = renderWithIntl(
      <TopicGroup
        {...defaultProps}
        bookmarks={bookmarks}
        maxVisible={3}
        isExpanded={true}
      />
    );
    const showMoreBtn = container.querySelector('.topic-show-more');
    fireEvent.click(showMoreBtn!);
    expect(container.querySelector('.topic-group-virtual-list')).toBeNull();
  });

  it('calls onSelectBookmark when bookmark is clicked', () => {
    const onSelectBookmark = vi.fn();
    const bookmarks = [createBookmark('1', 'Bookmark 1')];
    renderWithIntl(
      <TopicGroup {...defaultProps} bookmarks={bookmarks} onSelectBookmark={onSelectBookmark} />
    );
    fireEvent.click(screen.getByText('Bookmark 1'));
    expect(onSelectBookmark).toHaveBeenCalledTimes(1);
  });

  it('calls onToggle when header is clicked', () => {
    const onToggle = vi.fn();
    renderWithIntl(
      <TopicGroup {...defaultProps} onToggle={onToggle} />
    );
    fireEvent.click(screen.getByText('Test Topic'));
    expect(onToggle).toHaveBeenCalledWith('Test Topic');
  });
});
