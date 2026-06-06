/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnhanceToolbar from '../EnhanceToolbar';

afterEach(() => { cleanup(); });

describe('EnhanceToolbar', () => {
  it('renders enhance button', () => {
    render(<EnhanceToolbar visible onEnhance={vi.fn()} position={{ top: 0, left: 0 }} />);
    expect(screen.getByText('Enhance')).toBeDefined();
  });

  it('is hidden when not visible', () => {
    render(<EnhanceToolbar visible={false} onEnhance={vi.fn()} position={{ top: 0, left: 0 }} />);
    expect(screen.queryByText('Enhance')).toBeNull();
  });

  it('calls onEnhance when clicked', async () => {
    const onEnhance = vi.fn();
    const user = userEvent.setup();
    render(<EnhanceToolbar visible onEnhance={onEnhance} position={{ top: 0, left: 0 }} />);
    await user.click(screen.getByText('Enhance'));
    expect(onEnhance).toHaveBeenCalledTimes(1);
  });
});
