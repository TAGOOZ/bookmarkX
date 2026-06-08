/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { LocaleContext } from '../../../App';
import NotificationBell from '../NotificationBell';

const messages = {
  notifications: 'Notifications',
  noNotifications: 'No notifications',
};

afterEach(() => {
  cleanup();
});

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <IntlProvider locale="en" messages={messages}>
      <LocaleContext.Provider value={{ locale: 'en', setLocale: vi.fn() }}>
        {ui}
      </LocaleContext.Provider>
    </IntlProvider>
  );

describe('NotificationBell', () => {
  it('renders bell icon', () => {
    renderWithProviders(
      <NotificationBell unreadCount={0} onClick={vi.fn()} />
    );
    expect(screen.getByRole('button')).toBeTruthy();
  });

  it('shows unread count badge when count > 0', () => {
    renderWithProviders(
      <NotificationBell unreadCount={5} onClick={vi.fn()} />
    );
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('does not show badge when count is 0', () => {
    const { container } = renderWithProviders(
      <NotificationBell unreadCount={0} onClick={vi.fn()} />
    );
    expect(container.querySelector('[data-testid="unread-badge"]')).toBeNull();
  });

  it('shows 99+ for counts > 99', () => {
    renderWithProviders(
      <NotificationBell unreadCount={150} onClick={vi.fn()} />
    );
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    renderWithProviders(
      <NotificationBell unreadCount={1} onClick={onClick} />
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
