import { Defuddle } from 'defuddle/node';
import type { DefuddleResponse } from 'defuddle';

export interface ExtractedContent {
  html: string;
  title: string;
  description: string;
  author: string;
  siteName: string;
  favicon: string;
  image: string;
  wordCount: number;
  parseTime: number;
}

export async function extractContent(
  html: string,
  url: string,
): Promise<ExtractedContent> {
  const result: DefuddleResponse = await Defuddle(html, url, {
    removeImages: false,
    removeHiddenElements: true,
    removeLowScoring: true,
    removeContentPatterns: true,
    standardize: true,
  });

  return {
    html: result.content,
    title: result.title || '',
    description: result.description || '',
    author: result.author || '',
    siteName: result.site || '',
    favicon: result.favicon || '',
    image: result.image || '',
    wordCount: result.wordCount || 0,
    parseTime: result.parseTime || 0,
  };
}
