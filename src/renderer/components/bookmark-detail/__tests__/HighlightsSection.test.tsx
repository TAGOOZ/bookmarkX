/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import HighlightsSection from '../HighlightsSection';

afterEach(() => { cleanup(); });

const highlights = [
  { id: '1', text: 'Important quote here', note: 'My note on this', color: '#a882ff' },
  { id: '2', text: 'Another highlight', color: '#44cf6e' },
];

describe('HighlightsSection', () => {
  it('renders all highlights', () => {
    render(<HighlightsSection highlights={highlights} />);
    expect(screen.getByText('Important quote here')).toBeDefined();
    expect(screen.getByText('Another highlight')).toBeDefined();
  });

  it('renders inline notes when present', () => {
    render(<HighlightsSection highlights={highlights} />);
    expect(screen.getByText('My note on this')).toBeDefined();
  });

  it('renders nothing when empty', () => {
    const { container } = render(<HighlightsSection highlights={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
