/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotesEditor from '../NotesEditor';

afterEach(() => { cleanup(); });

describe('NotesEditor', () => {
  it('renders textarea with initial content', () => {
    render(<NotesEditor content="My notes here" onChange={vi.fn()} />);
    expect(screen.getByDisplayValue('My notes here')).toBeDefined();
  });

  it('calls onChange when text is edited', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NotesEditor content="" onChange={onChange} />);
    await user.type(screen.getByRole('textbox'), 'New note');
    expect(onChange).toHaveBeenCalled();
  });

  it('shows placeholder when empty', () => {
    render(<NotesEditor content="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Write your notes here...')).toBeDefined();
  });
});
