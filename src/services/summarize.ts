import type { Client } from '@libsql/client';
import { callGemini } from './gemini';
import { storeSummary } from '../db/summaries';
import { getArticleContent } from '../db/article-content';
import type { ServiceOptions, SummarizeResult } from './types';

function buildSummarizePrompt(
  title: string | null,
  tweetText: string | null,
  url: string,
  articleText?: string,
): string {
  const parts = [];
  if (title) parts.push(`Title: ${title}`);
  if (tweetText) parts.push(`Tweet: ${tweetText}`);
  parts.push(`URL: ${url}`);
  if (articleText) {
    // Truncate to ~8000 chars to stay within token limits
    const truncated = articleText.length > 8000
      ? articleText.substring(0, 8000) + '\n\n[Content truncated...]'
      : articleText;
    parts.push(`\nFull article content:\n${truncated}`);
  }

  return `Summarize this bookmark in both English and Arabic.

Bookmark info:
${parts.join('\n')}

Return JSON with:
- content_en: English summary (2-3 sentences)
- content_ar: Arabic summary (2-3 sentences)

Return ONLY valid JSON, no markdown.`;
}

export async function summarizeBookmark(
  db: Client,
  bookmarkId: string,
  bookmark: { title: string | null; tweet_text: string | null; url: string },
  options: ServiceOptions = {},
): Promise<SummarizeResult> {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const model = options.model || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const articleContent = await getArticleContent(db, bookmarkId);
  const prompt = buildSummarizePrompt(
    bookmark.title,
    bookmark.tweet_text,
    bookmark.url,
    articleContent?.extracted_text,
  );
  const text = await callGemini(prompt, { apiKey, model });

  let result: SummarizeResult;
  try {
    result = JSON.parse(text) as SummarizeResult;
  } catch {
    throw new Error(`Failed to parse summarize response as JSON: ${text.substring(0, 200)}`);
  }

  if (!result.content_en || !result.content_ar) {
    throw new Error('Invalid summary result');
  }

  await storeSummary(db, bookmarkId, {
    content_en: result.content_en,
    content_ar: result.content_ar,
    model_used: model,
  });

  return result;
}
