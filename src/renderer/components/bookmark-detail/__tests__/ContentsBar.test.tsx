/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentsBar from '../ContentsBar';

afterEach(() => {
  cleanup();
});

const sections = [
  { id: 'summary', label: 'Summary', visible: true },
  { id: 'glossary', label: 'Glossary', visible: true },
  { id: 'article', label: 'Article', visible: true },
  { id: 'highlights', label: 'Highlights', visible: false },
  { id: 'notes', label: 'Notes', visible: true },
  { id: 'chat', label: 'Chat', visible: true },
];

describe('ContentsBar', () => {
  it('renders section dashes for visible sections', () => {
    render(<ContentsBar sections={sections} activeSection="summary" onNavigate={vi.fn()} />);
    const dashes = screen.getAllByRole('button');
    expect(dashes.length).toBe(5);
  });

  it('does not render hidden sections', () => {
    render(<ContentsBar sections={sections} activeSection="summary" onNavigate={vi.fn()} />);
    expect(screen.queryByText('Highlights')).toBeNull();
  });

  it('calls onNavigate with section id when dash is clicked', async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    render(<ContentsBar sections={sections} activeSection="summary" onNavigate={onNavigate} />);
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[1]);
    expect(onNavigate).toHaveBeenCalledWith('glossary');
  });

  it('highlights the active section', () => {
    render(<ContentsBar sections={sections} activeSection="glossary" onNavigate={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons[1].className).toContain('active');
  });

  it('reveals section label on hover', async () => {
    const user = userEvent.setup();
    render(<ContentsBar sections={sections} activeSection="summary" onNavigate={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    await user.hover(buttons[0]);
    expect(screen.getByText('Summary')).toBeDefined();
  });
});
