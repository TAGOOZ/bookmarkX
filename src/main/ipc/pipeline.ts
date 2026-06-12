import { type IpcMain, app } from 'electron';
import type { Client } from '@libsql/client';
import { readConfig } from '../../main/user-config';

const cooldowns = new Map<string, number>();
const COOLDOWN_FETCH_MS = 10000;
const COOLDOWN_CLASSIFY_MS = 5000;

function checkCooldown(channel: string, cooldownMs: number): boolean {
  const now = Date.now();
  const last = cooldowns.get(channel) ?? 0;
  if (now - last < cooldownMs) return false;
  cooldowns.set(channel, now);
  return true;
}

function getConfigEnv(): { authToken?: string; ct0?: string; chromeProfile?: string; apiKey?: string } {
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
    if (!checkCooldown('fetch-bookmarks', COOLDOWN_FETCH_MS)) throw new Error('Rate limited — please wait');
    const { fetchAndStore } = await import('../../pipeline/fetch-and-store');
    const env = getConfigEnv();
    return fetchAndStore(db, {
      authToken: env.authToken,
      ct0: env.ct0,
      chromeProfile: env.chromeProfile,
    });
  });

  ipcMain.handle('classify-and-notify', async () => {
    if (!checkCooldown('classify-and-notify', COOLDOWN_CLASSIFY_MS)) throw new Error('Rate limited — please wait');
    const { classifyAndNotify } = await import('../../pipeline/classify-and-notify');
    const env = getConfigEnv();
    return classifyAndNotify(db, {
      apiKey: env.apiKey,
    });
  });

  ipcMain.handle('start-batch-import', async () => {
    const { startBatchImport } = await import('../../pipeline/batch-import');
    const env = getConfigEnv();
    const jobId = await startBatchImport(db, {
      authToken: env.authToken,
      ct0: env.ct0,
      chromeProfile: env.chromeProfile,
      apiKey: env.apiKey,
    });
    return { jobId };
  });

  ipcMain.handle('pause-batch-import', async () => {
    const { pauseImport } = await import('../../pipeline/batch-import');
    pauseImport();
    return { success: true };
  });

  ipcMain.handle('get-import-status', async (_event, jobId: string) => {
    const { getImportStatus } = await import('../../pipeline/batch-import');
    return getImportStatus(db, jobId);
  });

  ipcMain.handle('get-active-import', async () => {
    const { getActiveImport } = await import('../../pipeline/batch-import');
    return getActiveImport(db);
  });
}
