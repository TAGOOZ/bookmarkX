import type { Bookmark } from '../../types';

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface Highlight {
  id: string;
  text: string;
  note?: string;
  color?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface Hashtag {
  id: string;
  name: string;
}

export interface CustomSection {
  id: string;
  bookmark_id: string;
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface BookmarkDetailData extends Bookmark {
  summary?: string;
  summaryAr?: string;
  glossaryTerms?: GlossaryTerm[];
  highlights?: Highlight[];
  notes?: string;
  chatMessages?: ChatMessage[];
  chatSessionId?: string;
  readingTime?: number;
  blocks?: string;
  articleBlocks?: string;
  articleWordCount?: number;
  articleReadingTime?: number;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogSiteName?: string;
  hashtags?: Hashtag[];
  customSections?: CustomSection[];
}
