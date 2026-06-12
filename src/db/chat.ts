import type { Client } from '@libsql/client';

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

  const row = rows[0] as any;
  if (!row) return null;

  return {
    id: row.id,
    bookmark_id: row.bookmark_id,
    created_at: row.created_at,
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

  return (rows as any[]).map((row) => ({
    id: row.id,
    session_id: row.session_id,
    role: row.role,
    content: row.content,
    selected_text: row.selected_text || null,
    created_at: row.created_at,
  }));
}
