import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Client } from '@libsql/client';
import { createTestDb } from './test-client';
import {
  createChatSession,
  getChatSession,
  addChatMessage,
  getChatMessages,
} from '../chat';

describe('chat', () => {
  let db: Client;

  beforeEach(async () => {
    db = await createTestDb();
    await db.execute({
      sql: "INSERT INTO bookmarks (id, url, content_type) VALUES (?, ?, ?)",
      args: ['bm-1', 'https://example.com', 'outer_link'],
    });
  });

  afterEach(() => db.close());

  describe('createChatSession', () => {
    it('creates a session for a bookmark', async () => {
      const sessionId = await createChatSession(db, 'bm-1');
      expect(sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );

      const { rows } = await db.execute({
        sql: 'SELECT * FROM chat_sessions WHERE id = ?',
        args: [sessionId],
      });
      expect(rows).toHaveLength(1);
      const row = rows[0] as any;
      expect(row.bookmark_id).toBe('bm-1');
    });
  });

  describe('getChatSession', () => {
    it('returns null when session does not exist', async () => {
      const result = await getChatSession(db, 'nonexistent');
      expect(result).toBeNull();
    });

    it('returns the session by id', async () => {
      const sessionId = await createChatSession(db, 'bm-1');
      const result = await getChatSession(db, sessionId);
      expect(result).not.toBeNull();
      expect(result!.bookmark_id).toBe('bm-1');
    });
  });

  describe('addChatMessage', () => {
    it('adds a user message to a session', async () => {
      const sessionId = await createChatSession(db, 'bm-1');
      await addChatMessage(db, sessionId, 'user', 'What is this article about?');

      const messages = await getChatMessages(db, sessionId);
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('What is this article about?');
    });

    it('adds an assistant message to a session', async () => {
      const sessionId = await createChatSession(db, 'bm-1');
      await addChatMessage(db, sessionId, 'assistant', 'This article discusses...');

      const messages = await getChatMessages(db, sessionId);
      expect(messages).toHaveLength(1);
      expect(messages[0].role).toBe('assistant');
    });

    it('generates UUIDs for message ids', async () => {
      const sessionId = await createChatSession(db, 'bm-1');
      await addChatMessage(db, sessionId, 'user', 'Hello');

      const { rows } = await db.execute({
        sql: 'SELECT id FROM chat_messages WHERE session_id = ?',
        args: [sessionId],
      });
      const row = rows[0] as any;
      expect(row.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });
  });

  describe('getChatMessages', () => {
    it('returns empty array for new session', async () => {
      const sessionId = await createChatSession(db, 'bm-1');
      const messages = await getChatMessages(db, sessionId);
      expect(messages).toEqual([]);
    });

    it('returns messages in order', async () => {
      const sessionId = await createChatSession(db, 'bm-1');
      await addChatMessage(db, sessionId, 'user', 'First');
      await addChatMessage(db, sessionId, 'assistant', 'Second');
      await addChatMessage(db, sessionId, 'user', 'Third');

      const messages = await getChatMessages(db, sessionId);
      expect(messages).toHaveLength(3);
      expect(messages.map((m) => m.content)).toEqual(['First', 'Second', 'Third']);
    });

    it('stores and retrieves selected_text', async () => {
      const sessionId = await createChatSession(db, 'bm-1');
      await addChatMessage(db, sessionId, 'user', 'What is this?', 'selected text here');
      const messages = await getChatMessages(db, sessionId);
      expect(messages[0].selected_text).toBe('selected text here');
    });

    it('handles null selected_text', async () => {
      const sessionId = await createChatSession(db, 'bm-1');
      await addChatMessage(db, sessionId, 'user', 'Hello');
      const messages = await getChatMessages(db, sessionId);
      expect(messages[0].selected_text).toBeNull();
    });
  });
});
