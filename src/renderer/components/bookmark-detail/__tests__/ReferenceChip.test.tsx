/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReferenceChip from '../ReferenceChip';

afterEach(() => { cleanup(); });

describe('ReferenceChip', () => {
  it('renders the source section label', () => {
    render(<ReferenceChip sourceSection="summary" sentence="Test sentence" onJump={vi.fn()} />);
    expect(screen.getByText(/summary/i)).toBeDefined();
  });

  it('calls onJump when clicked', async () => {
    const onJump = vi.fn();
    const user = userEvent.setup();
    render(<ReferenceChip sourceSection="article" sentence="Click me" onJump={onJump} />);
    await user.click(screen.getByRole('button'));
    expect(onJump).toHaveBeenCalledWith('article', 'Click me');
  });
});
