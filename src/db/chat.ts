import type { Client } from '@libsql/client';
import type { ChatSessionRow, ChatMessageRow } from './row-types';
import { mapRow } from './row-types';

export interface ChatSession {
  id: string;
  bookmark_id: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  selected_text?: string | null;
  created_at: string;
}

const CHAT_SESSION_FIELDS: (keyof ChatSessionRow)[] = ['id', 'bookmark_id', 'created_at'];
const CHAT_MESSAGE_FIELDS: (keyof ChatMessageRow)[] = ['id', 'session_id', 'role', 'content', 'selected_text', 'created_at'];

export async function createChatSession(
  db: Client,
  bookmarkId: string,
): Promise<string> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: 'INSERT INTO chat_sessions (id, bookmark_id) VALUES (?, ?)',
    args: [id, bookmarkId],
  });
  return id;
}

export async function getChatSession(
  db: Client,
  sessionId: string,
): Promise<ChatSession | null> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM chat_sessions WHERE id = ?',
    args: [sessionId],
  });

  const row = rows[0];
  if (!row) return null;

  const r = mapRow<ChatSessionRow>(row, CHAT_SESSION_FIELDS);
  return {
    id: r.id,
    bookmark_id: r.bookmark_id,
    created_at: r.created_at,
  };
}

export async function addChatMessage(
  db: Client,
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  selectedText?: string,
): Promise<void> {
  const id = crypto.randomUUID();
  await db.execute({
    sql: 'INSERT INTO chat_messages (id, session_id, role, content, selected_text) VALUES (?, ?, ?, ?, ?)',
    args: [id, sessionId, role, content, selectedText || null],
  });
}

export async function getChatMessages(
  db: Client,
  sessionId: string,
): Promise<ChatMessage[]> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
    args: [sessionId],
  });

  return rows.map((row) => {
    const r = mapRow<ChatMessageRow>(row, CHAT_MESSAGE_FIELDS);
    return {
      id: r.id,
      session_id: r.session_id,
      role: r.role as ChatMessage['role'],
      content: r.content,
      selected_text: r.selected_text || null,
      created_at: r.created_at,
    };
  });
}

export async function getRecentChatMessages(
  db: Client,
  sessionId: string,
  limit: number,
): Promise<ChatMessage[]> {
  const { rows } = await db.execute({
    sql: 'SELECT * FROM (SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT ?) ORDER BY created_at ASC',
    args: [sessionId, limit],
  });

  return rows.map((row) => {
    const r = mapRow<ChatMessageRow>(row, CHAT_MESSAGE_FIELDS);
    return {
      id: r.id,
      session_id: r.session_id,
      role: r.role as ChatMessage['role'],
      content: r.content,
      selected_text: r.selected_text || null,
      created_at: r.created_at,
    };
  });
}
