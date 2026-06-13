import { type IpcMain } from 'electron';
import type { Client } from '@libsql/client';

export function registerContentSearchIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('search-articles', async (_event, query: string, limit?: number) => {
    if (!query || query.trim().length < 2) return [];
    const { searchArticleContent } = await import('../../db/article-content');
    return searchArticleContent(db, query, limit);
  });

  ipcMain.handle('get-article-content', async (_event, bookmarkId: string) => {
    const { getArticleContent } = await import('../../db/article-content');
    return getArticleContent(db, bookmarkId);
  });
}
