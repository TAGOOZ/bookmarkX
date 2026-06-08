/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { LocaleContext } from '../App';
import Settings from '../components/Settings';

const messages = {
  settings: 'Settings',
  userProfile: 'User Profile',
  name: 'Name',
  namePlaceholder: 'Your name',
  twitterHandle: 'Twitter Handle',
  twitterHandlePlaceholder: '@username',
  xAuth: 'X/Twitter Authentication',
  apiKey: 'Gemini API Key',
  apiKeyPlaceholder: 'Enter Gemini API key',
  authToken: 'Auth Token',
  authTokenPlaceholder: 'Enter auth_token',
  ct0: 'CT0 Cookie',
  ct0Placeholder: 'Enter ct0 cookie',
  chromeProfile: 'Chrome Profile',
  chromeProfilePlaceholder: 'Chrome profile name',
  geminiApi: 'Gemini API',
  preferences: 'Preferences',
  theme: 'Theme',
  language: 'Language',
  notifications: 'Notifications',
  fetchFrequency: 'Fetch Frequency',
  aiModel: 'AI Model',
  save: 'Save',
  cancel: 'Cancel',
  loginWithTwitter: 'Login with Twitter',
  loggingIn: 'Logging in...',
  detectedFromChrome: 'Detected from Chrome',
  or: 'or',
  detect: 'Detect',
  enteredManually: 'Entered manually',
  dark: 'Dark',
  light: 'Light',
  every3Hours: 'Every 3 hours',
  every6Hours: 'Every 6 hours',
  every12Hours: 'Every 12 hours',
  daily: 'Daily',
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
    detectChromeProfile: vi.fn(),
    twitterLogin: vi.fn(),
    fetchBookmarks: vi.fn(),
    classifyAndNotify: vi.fn(),
    summarizeBookmark: vi.fn(),
    extractArticle: vi.fn(),
    getArticleContent: vi.fn(),
    sendChatMessage: vi.fn(),
    createChatSession: vi.fn(),
    getChatMessages: vi.fn(),
    saveHighlight: vi.fn(),
    getHighlights: vi.fn(),
    saveNote: vi.fn(),
    getNotes: vi.fn(),
    addGlossaryTerm: vi.fn(),
    searchGlossary: vi.fn(),
    generateGlossary: vi.fn(),
    enhanceNote: vi.fn(),
    exportBookmark: vi.fn(),
    importMarkdown: vi.fn(),
    getTopicTree: vi.fn(),
    createTopic: vi.fn(),
    renameTopic: vi.fn(),
    reparentTopic: vi.fn(),
    deleteTopic: vi.fn(),
    moveBookmarkToTopic: vi.fn(),
    getAllHashtags: vi.fn(),
    getBookmarkHashtags: vi.fn(),
    attachHashtagToBookmark: vi.fn(),
    detachHashtagFromBookmark: vi.fn(),
    setBookmarkHashtags: vi.fn(),
    searchArticles: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
});

const renderWithIntl = (ui: React.ReactElement) =>
  render(
    <IntlProvider locale="en" messages={messages}>
      <LocaleContext.Provider value={{ locale: 'en', setLocale: vi.fn() }}>
        {ui}
      </LocaleContext.Provider>
    </IntlProvider>
  );

const defaultConfig = {
  name: '',
  twitterHandle: '',
  geminiApiKey: '',
  birdAuthToken: '',
  birdCt0: '',
  birdChromeProfile: '',
  theme: 'dark',
  language: 'ar',
  notifications: true,
  fetchFrequency: '0 */6 * * *',
  aiModel: 'gemini-2.0-flash',
};

describe('Settings IPC Integration', () => {
  it('loads existing settings on mount', async () => {
    mockGetSettings.mockResolvedValue({
      ...defaultConfig,
      geminiApiKey: 'test-key-123',
      birdChromeProfile: '/path/to/profile',
    });

    renderWithIntl(<Settings onClose={vi.fn()} />);

    await waitFor(() => {
      expect(mockGetSettings).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByDisplayValue('test-key-123')).toBeDefined();
    expect(screen.getByDisplayValue('/path/to/profile')).toBeDefined();
  });

  it('saves settings to user.json on submit', async () => {
    mockGetSettings.mockResolvedValue({ ...defaultConfig });
    mockSaveSettings.mockResolvedValue(undefined);

    const onClose = vi.fn();
    renderWithIntl(<Settings onClose={onClose} />);

    await waitFor(() => {
      expect(mockGetSettings).toHaveBeenCalled();
    });

    const apiKeyInput = screen.getByPlaceholderText('Enter Gemini API key');
    await userEvent.clear(apiKeyInput);
    await userEvent.type(apiKeyInput, 'new-api-key');

    const saveButton = screen.getByText('Save');
    await userEvent.click(saveButton);

    await waitFor(() => {
      expect(mockSaveSettings).toHaveBeenCalledWith({
        ...defaultConfig,
        geminiApiKey: 'new-api-key',
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

    resolveGetSettings!({ ...defaultConfig });

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).toBeNull();
    });
  });
});
