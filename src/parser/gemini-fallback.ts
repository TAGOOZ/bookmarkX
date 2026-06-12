import { callGemini } from '../services/gemini';
import type { PartialBlock } from '@blocknote/core';
import type { ParserResult, ParseOptions } from './types';

const GEMINI_PROMPT = `Extract the main article content from this URL. Return a JSON array of BlockNote blocks.
Each block has: type (heading|paragraph|bulletListItem|numberedListItem), content (string or inline array).
Inline content: { type: "text", text: "...", styles: { bold?: true, italic?: true, code?: true, link?: "url" } }
For headings include props: { level: 1|2|3|4|5|6 }
For images use: { type: "paragraph", content: [{ type: "text", text: "[Image: alt text]", styles: { italic: true } }] }
For code blocks: detect language from class attributes (e.g. class="language-python") and include it in a comment or as part of the text.
For tables, render as markdown table syntax.
For iframes/embeds, use: { type: "paragraph", content: [{ type: "text", text: "[Embed: url]", styles: { link: "url" } }] }

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

  let ogTitle = '';
  let ogDescription = '';
  const ogImage = '';
  const ogSiteName = '';

  for (const block of blocks) {
    const b = block as any;
    if (!ogTitle && b.type === 'heading') {
      const c = b.content;
      if (typeof c === 'string') {
        ogTitle = c;
      } else if (Array.isArray(c) && c.length > 0 && typeof c[0].text === 'string') {
        ogTitle = c[0].text;
      }
    }
    if (!ogDescription && b.type === 'paragraph') {
      const c = b.content;
      if (typeof c === 'string' && c.length > 20) {
        ogDescription = c;
      } else if (Array.isArray(c) && c.length > 0 && typeof c[0].text === 'string' && c[0].text.length > 20) {
        ogDescription = c[0].text;
      }
    }
    if (ogTitle && ogDescription) break;
  }

  return { blocks, wordCount, readingTime, ogTitle, ogDescription, ogImage, ogSiteName };
}
