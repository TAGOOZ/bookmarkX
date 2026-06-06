/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import Settings from '../components/Settings';

const messages = {
  settings: 'Settings',
  apiKey: 'Gemini API Key',
  authToken: 'Auth Token',
  ct0: 'CT0 Cookie',
  chromeProfile: 'Chrome Profile',
  save: 'Save',
  cancel: 'Cancel',
  loading: 'Loading...',
};

const mockGetSettings = vi.fn();
const mockSaveSettings = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  window.api = {
    getBookmarks: vi.fn(),
    getClassifications: vi.fn(),
    getBookmarkWithClassification: vi.fn(),
    getSettings: mockGetSettings,
    saveSettings: mockSaveSettings,
  };
});

afterEach(() => {
  cleanup();
});

const renderWithIntl = (ui: React.ReactElement) =>
  render(<IntlProvider locale="en" messages={messages}>{ui}</IntlProvider>);

describe('Settings IPC Integration', () => {
  it('loads existing settings on mount', async () => {
    mockGetSettings.mockResolvedValue({
      geminiApiKey: 'test-key-123',
      birdAuthToken: '',
      birdCt0: '',
      birdChromeProfile: '/path/to/profile',
    });

    renderWithIntl(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(mockGetSettings).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByDisplayValue('test-key-123')).toBeDefined();
    expect(screen.getByDisplayValue('/path/to/profile')).toBeDefined();
  });

  it('saves settings to .env on submit', async () => {
    mockGetSettings.mockResolvedValue({
      geminiApiKey: '',
      birdAuthToken: '',
      birdCt0: '',
      birdChromeProfile: '',
    });
    mockSaveSettings.mockResolvedValue(undefined);

    const onClose = vi.fn();
    renderWithIntl(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(mockGetSettings).toHaveBeenCalled();
    });

    const apiKeyInput = screen.getByPlaceholderText('أدخل مفتاح Gemini API');
    await userEvent.clear(apiKeyInput);
    await userEvent.type(apiKeyInput, 'new-api-key');

    const saveButton = screen.getByText('Save');
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalledWith({
        geminiApiKey: 'new-api-key',
        birdAuthToken: '',
        birdCt0: '',
        birdChromeProfile: '',
      });
    });

    expect(onClose).toHaveBeenCalled();
  });

  it('shows loading state while fetching settings', async () => {
    let resolveGetSettings: (value: unknown) => void;
    mockGetSettings.mockImplementation(
      () => new Promise((resolve) => { resolveGetSettings = resolve; }),
    );

    renderWithIntl(<Settings onClose={vi.fn()} />);

    expect(screen.getByText('Loading...')).toBeDefined();

    resolveGetSettings!({
      geminiApiKey: '',
      birdAuthToken: '',
      birdCt0: '',
      birdChromeProfile: '',
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeNull();
    });
  });
});
