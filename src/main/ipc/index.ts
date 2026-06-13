import type { Client } from '@libsql/client';
import { registerBookmarkIpc } from './bookmarks';
import { registerSettingsIpc } from './settings';
import { registerTopicIpc } from './topics';
import { type IpcMain } from 'electron';

let registered = false;

export function registerAllIpc(ipcMain: IpcMain, db: Client) {
  if (registered) return;
  registered = true;

  // Critical: registered synchronously for immediate renderer use
  registerBookmarkIpc(ipcMain, db);
  registerSettingsIpc(ipcMain);
  registerTopicIpc(ipcMain, db);

  // Deferred: imported async — available by the time renderer calls these channels
  (async () => {
    const [
      { registerTwitterIpc },
      { registerPipelineIpc },
      { registerContentIpc },
      { registerContentChatIpc },
      { registerContentGlossaryIpc },
      { registerContentHighlightsIpc },
      { registerContentNotesIpc },
      { registerContentSectionsIpc },
      { registerContentSearchIpc },
      { registerContentIoIpc },
      { registerHashtagIpc },
      { registerNotificationIpc },
    ] = await Promise.all([
      import('./twitter'),
      import('./pipeline'),
      import('./content'),
      import('./content-chat'),
      import('./content-glossary'),
      import('./content-highlights'),
      import('./content-notes'),
      import('./content-sections'),
      import('./content-search'),
      import('./content-io'),
      import('./hashtags'),
      import('./notifications'),
    ]);

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
    registerHashtagIpc(ipcMain, db);
    registerNotificationIpc(ipcMain, db);
  })().catch((err) => {
    console.error('Failed to register deferred IPC handlers:', err);
  });
}
