import { type IpcMain, BrowserWindow, session, app } from 'electron';
import path from 'node:path';
import os from 'node:os';
import { detectAndExtract } from '../../main/chrome-profile-detect';
import { readConfig } from '../../main/user-config';
import type { UserConfig } from '../../main/user-config';

function getConfig(): UserConfig {
  const userDataDir = app.getPath('userData');
  return readConfig(userDataDir);
}

const MAX_POLL_ATTEMPTS = 120;

export function registerTwitterIpc(ipcMain: IpcMain) {
  ipcMain.handle('detect-chrome-profile', async () => {
    const config = getConfig();
    const chromeDir = config.birdChromeProfile
      ? path.dirname(config.birdChromeProfile)
      : path.join(os.homedir(), '.config', 'google-chrome');
    return detectAndExtract(chromeDir);
  });

  ipcMain.handle('twitter-login', async () => {
    return new Promise<{ authToken: string; ct0: string } | { error: string }>((resolve) => {
      const loginWindow = new BrowserWindow({
        width: 600,
        height: 700,
        webPreferences: {
          partition: 'twitter-auth',
          nodeIntegration: false,
        },
      });

      loginWindow.loadURL('https://x.com/login');

      let resolved = false;
      let pollCount = 0;
      const checkInterval = setInterval(async () => {
        if (resolved) return;
        pollCount++;
        if (pollCount >= MAX_POLL_ATTEMPTS) {
          resolved = true;
          clearInterval(checkInterval);
          loginWindow.close();
          resolve({ error: 'polling timeout' });
          return;
        }
        try {
          const cookies = await session
            .fromPartition('twitter-auth')
            .cookies.get({ domain: 'x.com' });
          const authToken = cookies.find((c) => c.name === 'auth_token')?.value;
          const ct0 = cookies.find((c) => c.name === 'ct0')?.value;
          if (authToken && ct0) {
            resolved = true;
            clearInterval(checkInterval);
            loginWindow.close();
            resolve({ authToken, ct0 });
          }
        } catch {
          resolved = true;
          clearInterval(checkInterval);
          loginWindow.close();
          resolve({ error: 'polling error' });
        }
      }, 1000);

      loginWindow.on('closed', () => {
        if (!resolved) {
          resolved = true;
          clearInterval(checkInterval);
          resolve({ error: 'cancelled' });
        }
      });
    });
  });
}
