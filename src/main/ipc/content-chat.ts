import { type IpcMain } from 'electron';
import type { Client } from '@libsql/client';
import { checkCooldown, getConfigEnv } from './ipc-helpers';

export function registerContentChatIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('send-chat-message', async (_event, sessionId: string, message: string, articleContext?: string, selectedText?: string) => {
    if (!checkCooldown('send-chat-message')) throw new Error('Rate limited — please wait');
    if (typeof message === 'string' && message.length > 10000) {
      throw new Error('Chat message exceeds 10000 character limit');
    }
    const { sendMessage } = await import('../../services/chat');
    const env = await getConfigEnv();
    return sendMessage(db, sessionId, message, articleContext, { apiKey: env.apiKey }, selectedText);
  });

  ipcMain.handle('create-chat-session', async (_event, bookmarkId: string) => {
    const { createChatSession } = await import('../../db/chat');
    return createChatSession(db, bookmarkId);
  });

  ipcMain.handle('get-chat-messages', async (_event, sessionId: string) => {
    const { getChatMessages } = await import('../../db/chat');
    return getChatMessages(db, sessionId);
  });
}
