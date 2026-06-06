import { callGemini } from './gemini';
import type { ServiceOptions, EnhanceResult } from './types';

function buildEnhancePrompt(selectedText: string, context?: string): string {
  const parts = [];
  if (context) parts.push(`Context: ${context}`);
  parts.push(`Selected text: "${selectedText}"`);

  return `Enhance this selected text. Improve clarity, grammar, and readability while preserving the original meaning.

${parts.join('\n')}

Return JSON with:
- enhanced_text: The improved text

Return ONLY valid JSON, no markdown.`;
}

export async function enhanceNote(
  selectedText: string,
  context?: string,
  options: ServiceOptions = {},
): Promise<EnhanceResult> {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const model = options.model || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  const prompt = buildEnhancePrompt(selectedText, context);
  const text = await callGemini(prompt, { apiKey, model });
  const result = JSON.parse(text) as EnhanceResult;

  if (!result.enhanced_text) {
    throw new Error('Invalid enhance result');
  }

  return result;
}
