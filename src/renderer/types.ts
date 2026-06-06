export interface BookmarkData {
  id: string;
  tweet_id: string;
  url: string;
  content_type: 'outer_link' | 'thread' | 'x_article' | 'video';
  title: string | null;
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
    };
  }
}
