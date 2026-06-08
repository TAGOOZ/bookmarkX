import { type IpcMain } from 'electron';
import type { Client } from '@libsql/client';
import type { UserConfig } from '../../main/user-config';

function getConfigEnv(): { authToken?: string; ct0?: string; chromeProfile?: string; apiKey?: string } {
  const { readConfig } = require('../../main/user-config');
  const { app } = require('electron');
  const userDataDir = app.getPath('userData');
  const config = readConfig(userDataDir);
  return {
    authToken: config.birdAuthToken || undefined,
    ct0: config.birdCt0 || undefined,
    chromeProfile: config.birdChromeProfile || undefined,
    apiKey: config.geminiApiKey || undefined,
  };
}

export function registerPipelineIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('fetch-bookmarks', async () => {
    const { fetchAndStore } = await import('../../pipeline/fetch-and-store');
    const env = getConfigEnv();
    return fetchAndStore(db, {
      authToken: env.authToken,
      ct0: env.ct0,
      chromeProfile: env.chromeProfile,
    });
  });

  ipcMain.handle('classify-and-notify', async () => {
    const { classifyAndNotify } = await import('../../pipeline/classify-and-notify');
    const env = getConfigEnv();
    return classifyAndNotify(db, {
      apiKey: env.apiKey,
    });
  });
}
