import { execFile } from 'child_process';
import dotenv from 'dotenv';
import type { Bookmark } from '../fetch/types';
import type { ClassificationResult, ClassifierOptions } from './types';

dotenv.config();

function runCurl(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile('curl', args, (error, stdout, _stderr) => {
      if (error) return reject(error);
      resolve(stdout);
    });
  });
}

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

  const payload = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const stdout = await runCurl([
    '-s',
    '-X', 'POST',
    '-H', 'Content-Type: application/json',
    '-H', `x-goog-api-key: ${apiKey}`,
    '-d', payload,
    url,
  ]);

  let response: any;
  try {
    response = JSON.parse(stdout);
  } catch {
    throw new Error(`Failed to parse classifier API response as JSON: ${stdout.substring(0, 200)}`);
  }

  if (response.error) {
    throw new Error(response.error.message || 'Gemini API error');
  }

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Invalid Gemini API response');
  }

  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();

  let result: ClassificationResult;
  try {
    result = JSON.parse(cleaned) as ClassificationResult;
  } catch {
    throw new Error(`Failed to parse classification result as JSON: ${cleaned.substring(0, 200)}`);
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
