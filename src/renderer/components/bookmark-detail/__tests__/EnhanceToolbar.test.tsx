/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import EnhanceToolbar from '../EnhanceToolbar';

afterEach(() => { cleanup(); });

describe('EnhanceToolbar', () => {
  const defaultProps = {
    selectedText: 'Some selected text',
    position: { top: 100, left: 200 },
    onEnhance: vi.fn(),
    onHighlight: vi.fn(),
    onReference: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders nothing when position is null', () => {
    const { container } = render(
      <EnhanceToolbar {...defaultProps} position={null} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the toolbar at the given position', () => {
    render(<EnhanceToolbar {...defaultProps} />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar).toBeDefined();
    expect(toolbar.style.top).toBe('100px');
    expect(toolbar.style.left).toBe('200px');
  });

  it('shows the selected text truncated', () => {
    render(<EnhanceToolbar {...defaultProps} />);
    expect(screen.getByText(/Some selected text/)).toBeDefined();
  });

  it('truncates long selected text', () => {
    const longText = 'A'.repeat(100);
    render(<EnhanceToolbar {...defaultProps} selectedText={longText} />);
    expect(screen.getByText(/A+\.\.\./)).toBeDefined();
  });

  it('calls onEnhance when Enhance button is clicked', () => {
    render(<EnhanceToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText('Enhance'));
    expect(defaultProps.onEnhance).toHaveBeenCalledWith('Some selected text');
  });

  it('calls onHighlight when Highlight button is clicked', () => {
    render(<EnhanceToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText('Highlight'));
    expect(defaultProps.onHighlight).toHaveBeenCalledWith('Some selected text');
  });

  it('calls onReference when Reference button is clicked', () => {
    render(<EnhanceToolbar {...defaultProps} />);
    fireEvent.click(screen.getByText('Reference'));
    expect(defaultProps.onReference).toHaveBeenCalledWith('Some selected text');
  });

  it('calls onClose when close button is clicked', () => {
    render(<EnhanceToolbar {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Close toolbar'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onClose on Escape key', () => {
    render(<EnhanceToolbar {...defaultProps} />);
    fireEvent.keyDown(screen.getByRole('toolbar'), { key: 'Escape' });
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('has accessible ARIA attributes', () => {
    render(<EnhanceToolbar {...defaultProps} />);
    const toolbar = screen.getByRole('toolbar');
    expect(toolbar.getAttribute('aria-label')).toBe('Text actions');
  });
});
