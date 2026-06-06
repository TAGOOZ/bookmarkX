export interface BookmarkData {
  id: string;
  tweet_id: string;
  url: string;
  content_type: 'outer_link' | 'thread' | 'x_article' | 'video';
  title: string | null;
  title_ar: string | null;
  title_en: string | null;
  author_name: string | null;
  author_handle: string | null;
  tweet_text: string | null;
  fetched_at: string;
}

export interface ClassificationData {
  priority: 'high' | 'medium' | 'low';
  reading_time_min: number;
  topics: string[];
}

export interface UserConfig {
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
}

export interface ChromeProfileDetection {
  profiles: string[];
  selectedProfile: string;
  authToken?: string;
  ct0?: string;
  warning?: string;
}

declare global {
  interface Window {
    api: {
      getBookmarks: () => Promise<BookmarkData[]>;
      getClassifications: () => Promise<Array<{
        bookmark_id: string;
        priority: string;
        reading_time_min: number;
      }>>;
      getBookmarkWithClassification: (bookmarkId: string) => Promise<ClassificationData | null>;
      getSettings: () => Promise<UserConfig>;
      saveSettings: (settings: UserConfig) => Promise<void>;
      fetchBookmarks: () => Promise<{ stored: number; skipped: number }>;
      classifyAndNotify: () => Promise<{ classified: number; notified: number; errors: number }>;
      detectChromeProfile: () => Promise<ChromeProfileDetection>;
      twitterLogin: () => Promise<{ authToken: string; ct0: string } | { error: string }>;
      // Phase 2: Summarize
      summarizeBookmark: (bookmarkId: string) => Promise<unknown>;
      // Phase 2: Extract article
      extractArticle: (bookmarkId: string, url: string) => Promise<{ blocks_json?: string; word_count?: number; reading_time?: number } | null>;
      getArticleContent: (bookmarkId: string) => Promise<{ extracted_text: string; word_count: number; blocks_json?: string } | null>;
      // Phase 2: Chat
      sendChatMessage: (sessionId: string, message: string, articleContext?: string) => Promise<string>;
      createChatSession: (bookmarkId: string) => Promise<string | null>;
      getChatMessages: (sessionId: string) => Promise<Array<{ id: string; session_id: string; role: 'user' | 'assistant'; content: string; created_at: string }>>;
      // Phase 2: Highlights
      saveHighlight: (bookmarkId: string, data: { selected_text: string; note: string | null; color: string | null }) => Promise<{ success: boolean }>;
      getHighlights: (bookmarkId: string) => Promise<Array<{ id: string; bookmark_id: string; selected_text: string; note: string | null; color: string | null; created_at: string }>>;
      // Phase 2: Notes
      saveNote: (bookmarkId: string, data: { title: string | null; content: string | null }) => Promise<{ success: boolean }>;
      getNotes: (bookmarkId: string) => Promise<Array<{ id: string; bookmark_id: string; title: string | null; content: string | null; created_at: string; updated_at: string }>>;
      // Phase 2: Glossary
      addGlossaryTerm: (term: string, definition: string) => Promise<string>;
      searchGlossary: (query: string) => Promise<Array<{ id: string; term: string; definition: string; created_at: string }>>;
      generateGlossary: (bookmarkId: string, content: string, title?: string) => Promise<Array<{ term: string; definition: string }>>;
      // Phase 2: Enhance
      enhanceNote: (selectedText: string, context?: string) => Promise<{ enhanced_text?: string } | null>;
    };
  }
}
