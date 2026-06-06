/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import NotesEditor from '../NotesEditor';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => { cleanup(); });

describe('NotesEditor', () => {
  it('renders with initial JSON content', () => {
    const blocks = [{ type: 'paragraph', content: 'My notes here' }];
    const { container } = render(
      <NotesEditor content={JSON.stringify(blocks)} onChange={vi.fn()} />
    );
    expect(container.querySelector('.bn-editor')).toBeDefined();
  });

  it('renders with empty content', () => {
    const { container } = render(
      <NotesEditor content="" onChange={vi.fn()} />
    );
    expect(container.querySelector('.bn-editor')).toBeDefined();
  });

  it('renders with plain text fallback', () => {
    const { container } = render(
      <NotesEditor content="Plain text notes" onChange={vi.fn()} />
    );
    expect(container.querySelector('.bn-editor')).toBeDefined();
  });
});
