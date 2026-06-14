export interface Bookmark {
  id: string;
  tweet_id: string;
  url: string;
  content_type: 'outer_link' | 'thread' | 'x_article' | 'video' | 'plain_tweet';
  title: string | null;
  title_ar: string | null;
  title_en: string | null;
  author_name: string | null;
  author_handle: string | null;
  tweet_text: string | null;
  outer_urls: string[] | null;
  thread_tweet_count: number | null;
  video_url: string | null;
  fetched_at: string;
}

export interface FetchOptions {
  count?: number;
  cursor?: string;
  authToken?: string;
  ct0?: string;
  chromeProfile?: string;
  firefoxProfile?: string;
}

export interface FetchResult {
  bookmarks: Bookmark[];
  nextCursor: string | null;
  hasMore: boolean;
}
