/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { screen, cleanup, fireEvent } from '@testing-library/react';
import NotificationBell from '../NotificationBell';
import { renderWithIntl } from '../../../__tests__/test-utils';

afterEach(() => {
  cleanup();
});

describe('NotificationBell', () => {
  it('renders bell icon', () => {
    renderWithIntl(
      <NotificationBell unreadCount={0} onClick={vi.fn()} />
    );
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('shows unread count badge when count > 0', () => {
    renderWithIntl(
      <NotificationBell unreadCount={5} onClick={vi.fn()} />
    );
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('does not show badge when count is 0', () => {
    const { container } = renderWithIntl(
      <NotificationBell unreadCount={0} onClick={vi.fn()} />
    );
    expect(container.querySelector('[data-testid="unread-badge"]')).toBeNull();
  });

  it('shows 99+ for counts > 99', () => {
    renderWithIntl(
      <NotificationBell unreadCount={150} onClick={vi.fn()} />
    );
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    renderWithIntl(
      <NotificationBell unreadCount={1} onClick={onClick} />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
