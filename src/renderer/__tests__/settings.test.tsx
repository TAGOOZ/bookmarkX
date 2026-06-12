/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from '../components/Settings';
import { renderWithIntl } from './test-utils';

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
    deleteHighlight: vi.fn(),
    deleteNote: vi.fn(),
    getAllGlossaryTerms: vi.fn(),
    deleteGlossaryTerm: vi.fn(),
    exportGlossary: vi.fn(),
    getCustomSections: vi.fn().mockResolvedValue([]),
    createCustomSection: vi.fn(),
    updateCustomSection: vi.fn(),
    deleteCustomSection: vi.fn(),
    reorderCustomSections: vi.fn(),
  };
});

afterEach(() => {
  cleanup();
});

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
