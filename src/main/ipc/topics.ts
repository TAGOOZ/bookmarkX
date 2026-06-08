import { type IpcMain } from 'electron';
import type { Client } from '@libsql/client';

export function registerTopicIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('get-topic-tree', async () => {
    const { getTopicTree } = await import('../../db/topics');
    return getTopicTree(db);
  });

  ipcMain.handle('create-topic', async (_event, name: string, parentId: string | null) => {
    const { createTopic } = await import('../../db/topics');
    return createTopic(db, name, parentId, 'user');
  });

  ipcMain.handle('rename-topic', async (_event, topicId: string, newName: string) => {
    const { renameTopic } = await import('../../db/topics');
    await renameTopic(db, topicId, newName);
    return { success: true };
  });

  ipcMain.handle('reparent-topic', async (_event, topicId: string, newParentId: string | null) => {
    const { reparentTopic } = await import('../../db/topics');
    await reparentTopic(db, topicId, newParentId);
    return { success: true };
  });

  ipcMain.handle('delete-topic', async (_event, topicId: string) => {
    const { deleteTopic } = await import('../../db/topics');
    await deleteTopic(db, topicId);
    return { success: true };
  });

  ipcMain.handle('move-bookmark-to-topic', async (_event, bookmarkId: string, topicId: string | null) => {
    const { moveBookmarkToTopic } = await import('../../db/topics');
    await moveBookmarkToTopic(db, bookmarkId, topicId);
    return { success: true };
  });
}
