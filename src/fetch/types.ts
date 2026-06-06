export interface Bookmark {
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

export interface FetchOptions {
  count?: number;
  authToken?: string;
  ct0?: string;
  chromeProfile?: string;
  firefoxProfile?: string;
}
