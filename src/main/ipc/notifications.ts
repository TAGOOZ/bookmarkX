import { type IpcMain } from 'electron';
import type { Client } from '@libsql/client';

export function registerNotificationIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('get-notifications', async () => {
    const { getNotifications } = await import('../../db/notifications');
    return getNotifications(db);
  });

  ipcMain.handle('get-unread-count', async () => {
    const { getUnreadCount } = await import('../../db/notifications');
    return getUnreadCount(db);
  });

  ipcMain.handle('mark-notification-read', async (_event, id: string) => {
    const { markAsRead } = await import('../../db/notifications');
    await markAsRead(db, id);
    return { success: true };
  });

  ipcMain.handle('mark-all-notifications-read', async () => {
    const { markAllRead } = await import('../../db/notifications');
    await markAllRead(db);
    return { success: true };
  });

  ipcMain.handle('delete-notification', async (_event, id: string) => {
    const { deleteNotification } = await import('../../db/notifications');
    await deleteNotification(db, id);
    return { success: true };
  });
}
