import { callGemini } from '../services/gemini';
import type { PartialBlock } from '@blocknote/core';
import type { ParserResult, ParseOptions } from './types';

const GEMINI_PROMPT = `Extract the main article content from this URL. Return a JSON array of BlockNote blocks.
Each block has: type (heading|paragraph|bulletListItem|numberedListItem), content (string or inline array).
Inline content: { type: "text", text: "...", styles: { bold?: true, italic?: true, code?: true, link?: "url" } }
For headings include props: { level: 1|2|3 }
For images use: { type: "paragraph", content: [{ type: "text", text: "[Image: alt text]", styles: { italic: true } }] }
For code blocks use: { type: "paragraph", content: [{ type: "text", text: "...", styles: { code: true } }] }

Return ONLY a valid JSON array, no markdown fences.
URL: `;

export async function parseWithGemini(
  url: string,
  options: ParseOptions = {},
): Promise<ParserResult> {
  const apiKey = options.apiKey;
  const model = options.model || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for Gemini fallback');
  }

  const prompt = GEMINI_PROMPT + url;
  const text = await callGemini(prompt, { apiKey, model });

  let blocks: PartialBlock[];
  try {
    blocks = JSON.parse(text) as PartialBlock[];
    if (!Array.isArray(blocks) || blocks.length === 0) {
      throw new Error('Empty blocks array');
    }
  } catch {
    throw new Error('Failed to parse Gemini response as blocks');
  }

  const wordCount = blocks
    .filter((b: any) => typeof b.content === 'string')
    .map((b: any) => b.content)
    .join(' ')
    .split(/\s+/)
    .filter(Boolean).length;

  const readingTime = Math.max(1, Math.round(wordCount / 200));

  return { blocks, wordCount, readingTime };
}
