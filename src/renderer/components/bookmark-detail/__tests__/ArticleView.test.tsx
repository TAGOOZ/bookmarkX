/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArticleView from '../ArticleView';

afterEach(() => { cleanup(); });

describe('ArticleView', () => {
  it('renders article content', () => {
    render(<ArticleView content="<p>Hello world</p>" />);
    expect(screen.getByText('Hello world')).toBeDefined();
  });

  it('starts collapsed when defaultCollapsed is true', () => {
    render(<ArticleView content="<p>Content</p>" defaultCollapsed />);
    expect(screen.queryByText('Content')).toBeNull();
  });

  it('toggles collapse on button click', async () => {
    const user = userEvent.setup();
    render(<ArticleView content="<p>Content</p>" />);
    const btn = screen.getByRole('button');
    await user.click(btn);
    expect(screen.queryByText('Content')).toBeNull();
    await user.click(btn);
    expect(screen.getByText('Content')).toBeDefined();
  });

  it('renders nothing when content is empty', () => {
    const { container } = render(<ArticleView content="" />);
    expect(container.firstChild).toBeNull();
  });
});
