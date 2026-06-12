import type { Client } from '@libsql/client';
import { callGemini } from './gemini';
import { addChatMessage, getRecentChatMessages } from '../db/chat';
import type { ServiceOptions, ChatResult } from './types';

function buildChatPrompt(
  message: string,
  history: Array<{ role: string; content: string }>,
  articleContext?: string,
): string {
  const parts = [];
  if (articleContext) {
    parts.push(`Article context:\n${articleContext}\n`);
  }

  if (history.length > 0) {
    parts.push('Conversation history:');
    for (const msg of history) {
      parts.push(`${msg.role}: ${msg.content}`);
    }
  }

  parts.push(`\nUser: ${message}`);
  parts.push('\nRespond as a helpful assistant discussing the article. Be concise and accurate.');

  return parts.join('\n');
}

export async function sendMessage(
  db: Client,
  sessionId: string,
  message: string,
  articleContext?: string,
  options: ServiceOptions = {},
  selectedText?: string,
): Promise<ChatResult> {
  const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
  const model = options.model || 'gemini-2.0-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required');
  }

  await addChatMessage(db, sessionId, 'user', message, selectedText);

  const history = await getRecentChatMessages(db, sessionId, 20);
  const prompt = buildChatPrompt(message, history, articleContext);
  const response = await callGemini(prompt, { apiKey, model });

  await addChatMessage(db, sessionId, 'assistant', response);

  return { response };
}
