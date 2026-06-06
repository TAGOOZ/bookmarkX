import { Bookmark } from '../../App';

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
}
