/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import GlossarySection from '../GlossarySection';

afterEach(() => {
  cleanup();
});

const sampleTerms = [
  { term: 'API', definition: 'Application Programming Interface' },
  { term: 'REST', definition: 'Representational State Transfer' },
];

describe('GlossarySection', () => {
  it('renders terms when provided', () => {
    render(<GlossarySection terms={sampleTerms} />);
    expect(screen.getByText('API')).toBeDefined();
    expect(screen.getByText('Application Programming Interface')).toBeDefined();
    expect(screen.getByText('REST')).toBeDefined();
    expect(screen.getByText('Representational State Transfer')).toBeDefined();
  });

  it('renders nothing when no terms and no onAddTerm', () => {
    const { container } = render(<GlossarySection />);
    expect(container.firstChild).toBeNull();
  });

  it('renders add form when onAddTerm is provided', () => {
    render(<GlossarySection onAddTerm={vi.fn()} />);
    expect(screen.getByPlaceholderText('Term')).toBeDefined();
    expect(screen.getByPlaceholderText('Definition')).toBeDefined();
    expect(screen.getByText('Add')).toBeDefined();
  });

  it('calls onAddTerm with term and definition on submit', () => {
    const onAdd = vi.fn();
    render(<GlossarySection onAddTerm={onAdd} />);
    fireEvent.change(screen.getByPlaceholderText('Term'), { target: { value: 'NewTerm' } });
    fireEvent.change(screen.getByPlaceholderText('Definition'), { target: { value: 'NewDef' } });
    fireEvent.click(screen.getByText('Add'));
    expect(onAdd).toHaveBeenCalledWith('NewTerm', 'NewDef');
  });

  it('clears inputs after successful add', () => {
    const onAdd = vi.fn();
    render(<GlossarySection onAddTerm={onAdd} />);
    const termInput = screen.getByPlaceholderText('Term');
    const defInput = screen.getByPlaceholderText('Definition');
    fireEvent.change(termInput, { target: { value: 'X' } });
    fireEvent.change(defInput, { target: { value: 'Y' } });
    fireEvent.click(screen.getByText('Add'));
    expect((termInput as HTMLInputElement).value).toBe('');
    expect((defInput as HTMLInputElement).value).toBe('');
  });

  it('disables Add button when inputs are empty', () => {
    render(<GlossarySection onAddTerm={vi.fn()} />);
    expect(screen.getByText('Add').getAttribute('disabled')).not.toBeNull();
  });

  it('enables Add button when both inputs have values', () => {
    render(<GlossarySection onAddTerm={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Term'), { target: { value: 'T' } });
    fireEvent.change(screen.getByPlaceholderText('Definition'), { target: { value: 'D' } });
    expect(screen.getByText('Add').getAttribute('disabled')).toBeNull();
  });
});
