import { type IpcMain } from 'electron';
import type { Client } from '@libsql/client';

export function registerHashtagIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('get-all-hashtags', async () => {
    const { getAllHashtags } = await import('../../db/hashtags');
    return getAllHashtags(db);
  });

  ipcMain.handle('get-bookmark-hashtags', async (_event, bookmarkId: string) => {
    const { getBookmarkHashtags } = await import('../../db/hashtags');
    return getBookmarkHashtags(db, bookmarkId);
  });

  ipcMain.handle('attach-hashtag-to-bookmark', async (_event, bookmarkId: string, hashtagId: string) => {
    const { attachHashtagToBookmark } = await import('../../db/hashtags');
    await attachHashtagToBookmark(db, bookmarkId, hashtagId);
    return { success: true };
  });

  ipcMain.handle('detach-hashtag-from-bookmark', async (_event, bookmarkId: string, hashtagId: string) => {
    const { detachHashtagFromBookmark } = await import('../../db/hashtags');
    await detachHashtagFromBookmark(db, bookmarkId, hashtagId);
    return { success: true };
  });

  ipcMain.handle('set-bookmark-hashtags', async (_event, bookmarkId: string, hashtagNames: string[]) => {
    const { setBookmarkHashtags } = await import('../../db/hashtags');
    await setBookmarkHashtags(db, bookmarkId, hashtagNames);
    return { success: true };
  });
}
