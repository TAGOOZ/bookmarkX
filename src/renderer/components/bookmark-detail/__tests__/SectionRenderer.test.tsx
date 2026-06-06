/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SectionRenderer, { SectionDef } from '../SectionRenderer';

afterEach(() => { cleanup(); });

const makeSections = (overrides?: Partial<SectionDef>[]): SectionDef[] => [
  { id: 'summary', label: 'Summary', visible: true, owner: 'agent', render: () => <p>Summary content</p>, ...overrides?.[0] },
  { id: 'article', label: 'Article', visible: true, owner: 'shared', render: () => <p>Article content</p>, ...overrides?.[1] },
  { id: 'notes', label: 'Notes', visible: false, owner: 'user', render: () => <p>Notes content</p>, ...overrides?.[2] },
];

describe('SectionRenderer', () => {
  it('renders visible sections', () => {
    render(<SectionRenderer sections={makeSections()} />);
    expect(screen.getByText('Summary content')).toBeDefined();
    expect(screen.getByText('Article content')).toBeDefined();
  });

  it('hides invisible sections', () => {
    render(<SectionRenderer sections={makeSections()} />);
    expect(screen.queryByText('Notes content')).toBeNull();
  });

  it('returns null when all sections hidden', () => {
    const { container } = render(
      <SectionRenderer sections={[{ id: 'x', label: 'X', visible: false, owner: 'agent', render: () => null }]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('applies owner class', () => {
    render(<SectionRenderer sections={makeSections()} />);
    const summary = screen.getByTestId('section-summary');
    expect(summary.className).toContain('agent');
  });
});
