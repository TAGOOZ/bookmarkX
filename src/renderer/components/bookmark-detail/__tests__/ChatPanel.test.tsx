/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatPanel from '../ChatPanel';

afterEach(() => { cleanup(); });

const messages = [
  { id: '1', role: 'user' as const, content: 'What is this article about?' },
  { id: '2', role: 'assistant' as const, content: 'It discusses AI trends.' },
];

describe('ChatPanel', () => {
  it('renders messages', () => {
    render(<ChatPanel messages={messages} onSend={vi.fn()} />);
    expect(screen.getByText('What is this article about?')).toBeDefined();
    expect(screen.getByText('It discusses AI trends.')).toBeDefined();
  });

  it('calls onSend with input text', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ChatPanel messages={[]} onSend={onSend} />);
    await user.type(screen.getByRole('textbox'), 'Hello');
    await user.click(screen.getByRole('button'));
    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('renders empty state when no messages', () => {
    render(<ChatPanel messages={[]} onSend={vi.fn()} />);
    expect(screen.getByText('Ask about this bookmark...')).toBeDefined();
  });
});
