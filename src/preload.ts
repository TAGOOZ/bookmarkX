import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  getClassifications: () => ipcRenderer.invoke('get-classifications'),
  getBookmarkWithClassification: (bookmarkId: string) =>
    ipcRenderer.invoke('get-bookmark-with-classification', bookmarkId),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: {
    name: string;
    twitterHandle: string;
    geminiApiKey: string;
    birdAuthToken: string;
    birdCt0: string;
    birdChromeProfile: string;
    theme: 'dark' | 'light';
    language: 'ar' | 'en';
    notifications: boolean;
    fetchFrequency: string;
    aiModel: string;
  }) => ipcRenderer.invoke('save-settings', settings),
  detectChromeProfile: () => ipcRenderer.invoke('detect-chrome-profile'),
  twitterLogin: () => ipcRenderer.invoke('twitter-login'),
  fetchBookmarks: () => ipcRenderer.invoke('fetch-bookmarks'),
  classifyAndNotify: () => ipcRenderer.invoke('classify-and-notify'),
  // Phase 2: Summarize
  summarizeBookmark: (bookmarkId: string) =>
    ipcRenderer.invoke('summarize-bookmark', bookmarkId),
  // Phase 2: Extract article
  extractArticle: (bookmarkId: string, url: string) =>
    ipcRenderer.invoke('extract-article', bookmarkId, url),
  // Get article content (including blocks_json)
  getArticleContent: (bookmarkId: string) =>
    ipcRenderer.invoke('get-article-content', bookmarkId),
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
  // Phase 2: Glossary generation
  generateGlossary: (bookmarkId: string, content: string, title?: string) =>
    ipcRenderer.invoke('generate-glossary', bookmarkId, content, title),
  // Phase 4: Full-text search
  searchArticles: (query: string, limit?: number) =>
    ipcRenderer.invoke('search-articles', query, limit),
  // Phase 6: Export & Import
  exportBookmark: (format: 'md' | 'json', content: string, defaultName: string) =>
    ipcRenderer.invoke('export-bookmark', format, content, defaultName),
  importMarkdown: () => ipcRenderer.invoke('import-markdown'),
  // Phase 1: Topics
  getTopicTree: () => ipcRenderer.invoke('get-topic-tree'),
  createTopic: (name: string, parentId: string | null) =>
    ipcRenderer.invoke('create-topic', name, parentId),
  renameTopic: (topicId: string, newName: string) =>
    ipcRenderer.invoke('rename-topic', topicId, newName),
  reparentTopic: (topicId: string, newParentId: string | null) =>
    ipcRenderer.invoke('reparent-topic', topicId, newParentId),
  deleteTopic: (topicId: string) =>
    ipcRenderer.invoke('delete-topic', topicId),
  moveBookmarkToTopic: (bookmarkId: string, topicId: string | null) =>
    ipcRenderer.invoke('move-bookmark-to-topic', bookmarkId, topicId),
  // Phase 1: Hashtags
  getAllHashtags: () => ipcRenderer.invoke('get-all-hashtags'),
  getBookmarkHashtags: (bookmarkId: string) =>
    ipcRenderer.invoke('get-bookmark-hashtags', bookmarkId),
  attachHashtagToBookmark: (bookmarkId: string, hashtagId: string) =>
    ipcRenderer.invoke('attach-hashtag-to-bookmark', bookmarkId, hashtagId),
  detachHashtagFromBookmark: (bookmarkId: string, hashtagId: string) =>
    ipcRenderer.invoke('detach-hashtag-from-bookmark', bookmarkId, hashtagId),
  setBookmarkHashtags: (bookmarkId: string, hashtagNames: string[]) =>
    ipcRenderer.invoke('set-bookmark-hashtags', bookmarkId, hashtagNames),
});
