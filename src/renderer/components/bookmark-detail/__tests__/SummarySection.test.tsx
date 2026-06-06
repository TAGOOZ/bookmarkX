/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import SummarySection from '../SummarySection';

afterEach(() => {
  cleanup();
});

describe('SummarySection', () => {
  it('renders Arabic summary when provided', () => {
    render(<SummarySection contentAr="ملخص بالعربي" />);
    expect(screen.getByText('ملخص بالعربي')).toBeDefined();
  });

  it('renders English summary when provided', () => {
    render(<SummarySection content="English summary" />);
    expect(screen.getByText('English summary')).toBeDefined();
  });

  it('renders both summaries when both provided', () => {
    render(<SummarySection content="English" contentAr="عربي" />);
    expect(screen.getByText('عربي')).toBeDefined();
    expect(screen.getByText('English')).toBeDefined();
  });

  it('renders nothing when no content provided', () => {
    const { container } = render(<SummarySection />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when both props are empty strings', () => {
    const { container } = render(<SummarySection content="" contentAr="" />);
    expect(container.firstChild).toBeNull();
  });
});
