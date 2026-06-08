import { type IpcMain } from 'electron';
import type { Client } from '@libsql/client';
import { getStoredBookmarks } from '../../db/bookmarks';
import { getClassifiedBookmarks, getClassification } from '../../db/classifications';

export function registerBookmarkIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('get-bookmarks', async () => {
    return getStoredBookmarks(db);
  });

  ipcMain.handle('get-classifications', async () => {
    return getClassifiedBookmarks(db);
  });

  ipcMain.handle('get-bookmark-with-classification', async (_event, bookmarkId: string) => {
    return getClassification(db, bookmarkId);
  });
}
