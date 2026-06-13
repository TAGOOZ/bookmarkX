import type { Client } from '@libsql/client';
import { registerBookmarkIpc } from './bookmarks';
import { registerSettingsIpc } from './settings';
import { registerTwitterIpc } from './twitter';
import { registerPipelineIpc } from './pipeline';
import { registerContentIpc } from './content';
import { registerContentChatIpc } from './content-chat';
import { registerContentGlossaryIpc } from './content-glossary';
import { registerContentHighlightsIpc } from './content-highlights';
import { registerContentNotesIpc } from './content-notes';
import { registerContentSectionsIpc } from './content-sections';
import { registerContentSearchIpc } from './content-search';
import { registerContentIoIpc } from './content-io';
import { registerTopicIpc } from './topics';
import { registerHashtagIpc } from './hashtags';
import { registerNotificationIpc } from './notifications';
import { type IpcMain } from 'electron';

let registered = false;

export function registerAllIpc(ipcMain: IpcMain, db: Client) {
  if (registered) return;
  registered = true;

  registerBookmarkIpc(ipcMain, db);
  registerSettingsIpc(ipcMain);
  registerTwitterIpc(ipcMain);
  registerPipelineIpc(ipcMain, db);
  registerContentIpc(ipcMain, db);
  registerContentChatIpc(ipcMain, db);
  registerContentGlossaryIpc(ipcMain, db);
  registerContentHighlightsIpc(ipcMain, db);
  registerContentNotesIpc(ipcMain, db);
  registerContentSectionsIpc(ipcMain, db);
  registerContentSearchIpc(ipcMain, db);
  registerContentIoIpc(ipcMain);
  registerTopicIpc(ipcMain, db);
  registerHashtagIpc(ipcMain, db);
  registerNotificationIpc(ipcMain, db);
}
