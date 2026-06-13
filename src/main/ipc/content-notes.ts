import { type IpcMain } from 'electron';
import type { Client } from '@libsql/client';
import { checkCooldown, getConfigEnv } from './ipc-helpers';

export function registerContentNotesIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('save-note', async (_event, bookmarkId: string, data: { title: string | null; content: string | null }) => {
    const { createNote } = await import('../../db/notes');
    await createNote(db, bookmarkId, data);
    return { success: true };
  });

  ipcMain.handle('get-notes', async (_event, bookmarkId: string) => {
    const { getNotes } = await import('../../db/notes');
    return getNotes(db, bookmarkId);
  });

  ipcMain.handle('delete-note', async (_event, noteId: string) => {
    const { deleteNote } = await import('../../db/notes');
    await deleteNote(db, noteId);
    return { success: true };
  });

  ipcMain.handle('enhance-note', async (_event, selectedText: string, context?: string) => {
    if (!checkCooldown('enhance-note')) throw new Error('Rate limited — please wait');
    if (typeof selectedText === 'string' && selectedText.length > 5000) {
      throw new Error('Text to enhance exceeds 5000 character limit');
    }
    const { enhanceNote } = await import('../../services/enhance');
    const env = await getConfigEnv();
    return enhanceNote(selectedText, context, { apiKey: env.apiKey });
  });
}
