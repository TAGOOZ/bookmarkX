import type { Client } from '@libsql/client';
import { registerBookmarkIpc } from './bookmarks';
import { registerSettingsIpc } from './settings';
import { registerTwitterIpc } from './twitter';
import { registerPipelineIpc } from './pipeline';
import { registerContentIpc } from './content';
import { registerTopicIpc } from './topics';
import { registerHashtagIpc } from './hashtags';
import { registerNotificationIpc } from './notifications';
import { type IpcMain } from 'electron';

export function registerAllIpc(ipcMain: IpcMain, db: Client) {
  registerBookmarkIpc(ipcMain, db);
  registerSettingsIpc(ipcMain);
  registerTwitterIpc(ipcMain);
  registerPipelineIpc(ipcMain, db);
  registerContentIpc(ipcMain, db);
  registerTopicIpc(ipcMain, db);
  registerHashtagIpc(ipcMain, db);
  registerNotificationIpc(ipcMain, db);
}
