import { callGemini } from '../services/gemini';
import type { Bookmark } from '../fetch/types';
import type { ClassificationResult, ClassifierOptions } from './types';

function buildPrompt(bookmark: Bookmark): string {
  const parts = [];
  if (bookmark.title) parts.push(`Title: ${bookmark.title}`);
  if (bookmark.author_name) parts.push(`Author: ${bookmark.author_name} (@${bookmark.author_handle})`);
  if (bookmark.tweet_text) parts.push(`Tweet: ${bookmark.tweet_text}`);
  parts.push(`Content type: ${bookmark.content_type}`);
  parts.push(`URL: ${bookmark.url}`);

  return `Classify this bookmark. Return JSON with:
- priority: "high" | "medium" | "low" (how important/useful is this to read?)
- topic: string (single best topic, e.g. "AI", "Web Development")
- hashtags: string[] (2-5 relevant hashtags, e.g. ["machine-learning", "tutorial"])
- reading_time_min: number (estimated minutes to read)

Bookmark info:
${parts.join('\n')}

Return ONLY valid JSON, no markdown.`;
}

export async function classifyBookmark(
  bookmark: Bookmark,
  options: ClassifierOptions = {}
): Promise<ClassificationResult> {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const model = options.model || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const prompt = buildPrompt(bookmark);

  const text = await callGemini(prompt, { apiKey, model });

  let result: ClassificationResult;
  try {
    result = JSON.parse(text) as ClassificationResult;
  } catch {
    throw new Error(`Failed to parse classification result as JSON: ${text.substring(0, 200)}`);
  }

  if (!result.priority || !result.topic || !result.reading_time_min) {
    throw new Error('Invalid classification result');
  }

  // Ensure hashtags is an array
  if (!Array.isArray(result.hashtags)) {
    result.hashtags = [];
  }

  return result;
}
