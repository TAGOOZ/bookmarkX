/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import SentenceRef from '../SentenceRef';

afterEach(() => { cleanup(); });

const q = (label: string) => document.querySelector(`[aria-label="${label}"]`) as HTMLElement | null;

describe('SentenceRef', () => {
  it('renders children text', () => {
    render(<SentenceRef section="summary">Hello world</SentenceRef>);
    expect(document.body.textContent).toContain('Hello world');
  });

  it('shows link icon on hover', () => {
    const { container } = render(<SentenceRef section="summary">Test sentence</SentenceRef>);
    const wrapper = container.querySelector('span')!;
    fireEvent.mouseEnter(wrapper);
    expect(q('Copy reference')).not.toBeNull();
  });

  it('hides link icon on mouse leave', () => {
    const { container } = render(<SentenceRef section="summary">Test sentence</SentenceRef>);
    const wrapper = container.querySelector('span')!;
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);
    expect(q('Copy reference')).toBeNull();
  });

  it('shows checkmark after click', () => {
    const { container } = render(<SentenceRef section="summary">My sentence</SentenceRef>);
    const wrapper = container.querySelector('span')!;
    fireEvent.mouseEnter(wrapper);
    fireEvent.click(q('Copy reference')!);

    expect(q('Copy reference')!.textContent).toBe('\u2713');
  });

  it('has accessible label and title', () => {
    const { container } = render(<SentenceRef section="glossary">Term</SentenceRef>);
    const wrapper = container.querySelector('span')!;
    fireEvent.mouseEnter(wrapper);
    const btn = q('Copy reference')!;
    expect(btn.getAttribute('title')).toBe('Copy reference link');
  });
});
