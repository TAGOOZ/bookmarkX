import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  getClassifications: () => ipcRenderer.invoke('get-classifications'),
  getBookmarkWithClassification: (bookmarkId: string) =>
    ipcRenderer.invoke('get-bookmark-with-classification', bookmarkId),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: {
    geminiApiKey: string;
    birdAuthToken: string;
    birdCt0: string;
    birdChromeProfile: string;
  }) => ipcRenderer.invoke('save-settings', settings),
  fetchBookmarks: () => ipcRenderer.invoke('fetch-bookmarks'),
  classifyAndNotify: () => ipcRenderer.invoke('classify-and-notify'),
  // Phase 2: Summarize
  summarizeBookmark: (bookmarkId: string) =>
    ipcRenderer.invoke('summarize-bookmark', bookmarkId),
  // Phase 2: Extract article
  extractArticle: (bookmarkId: string, url: string) =>
    ipcRenderer.invoke('extract-article', bookmarkId, url),
  // Phase 2: Chat
  sendChatMessage: (sessionId: string, message: string, articleContext?: string) =>
    ipcRenderer.invoke('send-chat-message', sessionId, message, articleContext),
  createChatSession: (bookmarkId: string) =>
    ipcRenderer.invoke('create-chat-session', bookmarkId),
  getChatMessages: (sessionId: string) =>
    ipcRenderer.invoke('get-chat-messages', sessionId),
  // Phase 2: Highlights
  saveHighlight: (bookmarkId: string, data: { selected_text: string; note: string | null; color: string | null }) =>
    ipcRenderer.invoke('save-highlight', bookmarkId, data),
  getHighlights: (bookmarkId: string) =>
    ipcRenderer.invoke('get-highlights', bookmarkId),
  // Phase 2: Notes
  saveNote: (bookmarkId: string, data: { title: string | null; content: string | null }) =>
    ipcRenderer.invoke('save-note', bookmarkId, data),
  getNotes: (bookmarkId: string) =>
    ipcRenderer.invoke('get-notes', bookmarkId),
  // Phase 2: Glossary
  addGlossaryTerm: (term: string, definition: string) =>
    ipcRenderer.invoke('add-glossary-term', term, definition),
  searchGlossary: (query: string) =>
    ipcRenderer.invoke('search-glossary', query),
  // Phase 2: Enhance
  enhanceNote: (selectedText: string, context?: string) =>
    ipcRenderer.invoke('enhance-note', selectedText, context),
});
