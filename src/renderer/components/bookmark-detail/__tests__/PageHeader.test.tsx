/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import PageHeader from '../PageHeader';

afterEach(() => {
  cleanup();
});

const defaultProps = {
  title: 'Test Bookmark Title',
  url: 'https://example.com/article',
  topic: 'technology',
  priority: 'high' as const,
  contentType: 'article',
  readingTime: 5,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader {...defaultProps} />);
    expect(screen.getByText('Test Bookmark Title')).toBeDefined();
  });

  it('renders the URL as a clickable link', () => {
    render(<PageHeader {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('https://example.com/article');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('renders metadata line with topic and content type', () => {
    render(<PageHeader {...defaultProps} />);
    expect(screen.getByText('technology')).toBeDefined();
    expect(screen.getByText('article')).toBeDefined();
  });

  it('renders reading time', () => {
    render(<PageHeader {...defaultProps} />);
    expect(screen.getByText('5 min read')).toBeDefined();
  });

  it('renders relative time from createdAt', () => {
    render(<PageHeader {...defaultProps} />);
    expect(screen.getByText(/updated.*ago/)).toBeDefined();
  });

  it('renders nothing when title is empty', () => {
    const { container } = render(
      <PageHeader {...defaultProps} title="" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
