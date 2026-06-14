import type { Row } from '@libsql/client';

export interface BookmarkRow {
  id: string;
  tweet_id: string;
  url: string;
  content_type: string;
  title: string | null;
  title_ar: string | null;
  title_en: string | null;
  author_name: string | null;
  author_handle: string | null;
  tweet_text: string | null;
  outer_urls: string | null;
  thread_tweet_count: number | null;
  video_url: string | null;
  topic_id: string | null;
  fetched_at: string | null;
  created_at: string;
}

export interface ClassificationRow {
  id: string;
  bookmark_id: string;
  priority: string;
  reading_time_min: number;
  created_at: string;
}

export interface TopicRow {
  id: string;
  name: string;
  parent_id: string | null;
  created_by: string;
  created_at: string;
}

export interface HashtagRow {
  id: string;
  name: string;
  created_at: string;
}

export interface BookmarkHashtagRow {
  bookmark_id: string;
  hashtag_id: string;
}

export interface GlossaryTermRow {
  id: string;
  term: string;
  definition: string;
  created_at: string;
}

export interface BookmarkGlossaryRow {
  bookmark_id: string;
  term_id: string;
}

export interface ChatSessionRow {
  id: string;
  bookmark_id: string;
  created_at: string;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  selected_text: string | null;
  created_at: string;
}

export interface SummaryRow {
  id: string;
  bookmark_id: string;
  content_en: string | null;
  content_ar: string | null;
  model_used: string | null;
  created_at: string;
}

export interface HighlightRow {
  id: string;
  bookmark_id: string;
  selected_text: string;
  note: string | null;
  color: string | null;
  created_at: string;
}

export interface NoteRow {
  id: string;
  bookmark_id: string;
  title: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImportJobRow {
  id: string;
  status: string;
  cursor: string | null;
  total_fetched: number;
  total_classified: number;
  started_at: string;
  completed_at: string | null;
}

export interface CustomSectionRow {
  id: string;
  bookmark_id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ArticleContentRow {
  id: string;
  bookmark_id: string;
  extracted_text: string;
  word_count: number;
  blocks_json: string | null;
  parser_version: number;
  content_hash: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_site_name: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: number;
  data: string | null;
  created_at: string;
}

export interface TopicCountRow {
  topic_id: string;
  cnt: number;
}

export interface MaxOrderRow {
  next_order: number;
}

export interface ClassificationJoinedRow {
  bookmark_id: string;
  priority: string;
  reading_time_min: number;
  topic: string;
}

export interface HashtagJoinRow {
  bookmark_id: string;
  name: string;
}

export interface TopicNameRow {
  name: string;
}

export interface FtsSearchRow {
  bookmark_id: string;
  snippet: string;
  rank: number;
}

export interface CountRow {
  count: number;
}

export function mapRow<T>(row: Row, fields: (keyof T)[]): T {
  const result = {} as T;
  for (const field of fields) {
    (result as Record<string, unknown>)[field as string] = row[field as string];
  }
  return result;
}
