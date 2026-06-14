// Error handling: All IPC handlers let errors propagate to the renderer.
// Do NOT add try/catch blocks that return null/[] — the renderer's error
// handlers need the exception to trigger error UI. Structured returns
// ({ success: true }, { cancelled: true }) are intentional, not error swallowing.
import { type IpcMain } from 'electron';
import type { Client } from '@libsql/client';
import { checkCooldown, getConfigEnv, invalidateConfigCache } from './ipc-helpers';

export { invalidateConfigCache };

export function registerContentIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('summarize-bookmark', async (_event, bookmarkId: string) => {
    if (!checkCooldown('summarize-bookmark')) throw new Error('Rate limited — please wait');
    const { summarizeBookmark } = await import('../../services/summarize');
    const { getBookmarkById } = await import('../../db/bookmarks');
    const bookmark = await getBookmarkById(db, bookmarkId);
    if (!bookmark) throw new Error('Bookmark not found');
    const env = await getConfigEnv();
    return summarizeBookmark(db, bookmarkId, bookmark, { apiKey: env.apiKey });
  });

  ipcMain.handle('extract-article', async (_event, bookmarkId: string, url: string) => {
    try {
      const { extractArticle } = await import('../../services/extract');
      const { getBookmarkById } = await import('../../db/bookmarks');
      const env = await getConfigEnv();
      const bookmark = await getBookmarkById(db, bookmarkId);
      const outerUrls = bookmark?.outer_urls ?? undefined;
      return await extractArticle(db, bookmarkId, url, { apiKey: env.apiKey }, outerUrls);
    } catch (err) {
      console.error('extract-article failed:', err);
      throw err;
    }
  });
}
