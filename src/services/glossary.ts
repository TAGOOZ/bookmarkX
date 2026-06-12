import { callGemini } from './gemini';
import type { ServiceOptions } from './types';

export interface GlossaryTermResult {
  term: string;
  definition: string;
}

interface GlossaryPromptOptions extends ServiceOptions {
  title?: string;
}

function buildGlossaryPrompt(content: string, title?: string): string {
  const parts = [];
  if (title) parts.push(`Title: ${title}`);
  parts.push(`Content: ${content}`);

  return `Extract technical terms from this article and provide Egyptian Arabic definitions for each.

${parts.join('\n')}

Return JSON with:
- terms: Array of { term: string, definition: string } objects
  - term: The technical term (keep in original language, e.g. "API", "REST", "Neural Network")
  - definition: Egyptian Arabic definition (e.g. "واجهة برمجة تطبيقات")

Extract 5-15 key technical terms. Focus on domain-specific vocabulary, not common words.

Return ONLY valid JSON, no markdown.`;
}

export async function generateGlossary(
  content: string,
  options: GlossaryPromptOptions = {},
): Promise<GlossaryTermResult[]> {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const model = options.model || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const prompt = buildGlossaryPrompt(content, options.title);
  const text = await callGemini(prompt, { apiKey, model });

  let result: { terms?: GlossaryTermResult[] };
  try {
    result = JSON.parse(text) as { terms?: GlossaryTermResult[] };
  } catch {
    throw new Error(`Failed to parse glossary response as JSON: ${text.substring(0, 200)}`);
  }

  if (!result.terms || !Array.isArray(result.terms)) {
    throw new Error('Invalid glossary result');
  }

  return result.terms;
}
