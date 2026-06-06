import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { createClient, type Client } from '@libsql/client';

// Disable GPU acceleration on Linux to avoid crashes
// NOTE: --no-sandbox MUST be passed as CLI arg, not appendSwitch (see electron/electron#47650)
// Use: pnpm start:linux
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
  app.commandLine.appendSwitch('in-process-gpu');
}
import { initializeSchema } from './db/schema';
import { getStoredBookmarks } from './db/bookmarks';
import { getClassifiedBookmarks } from './db/classifications';
import { startCronScheduler } from './scheduler/cron';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let db: Client;

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Initialize database and IPC handlers
app.whenReady().then(async () => {
  // Initialize SQLite database
  const dbPath = path.join(app.getPath('userData'), 'bookmarks.db');
  db = createClient({ url: `file:${dbPath}` });
  await initializeSchema(db);

  // IPC handlers for bookmark data
  ipcMain.handle('get-bookmarks', async () => {
    return getStoredBookmarks(db);
  });

  ipcMain.handle('get-classifications', async () => {
    return getClassifiedBookmarks(db);
  });

  ipcMain.handle('get-bookmark-with-classification', async (_event, bookmarkId: string) => {
    const { getClassification } = await import('./db/classifications');
    return getClassification(db, bookmarkId);
  });

  // Settings IPC handlers
  const envPath = path.join(app.getAppPath(), '.env');

  ipcMain.handle('get-settings', () => {
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    const parse = (key: string): string => {
      const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
      return match ? match[1] : '';
    };
    return {
      geminiApiKey: parse('GEMINI_API_KEY'),
      birdAuthToken: parse('BIRD_AUTH_TOKEN'),
      birdCt0: parse('BIRD_CT0'),
      birdChromeProfile: parse('BIRD_CHROME_PROFILE'),
    };
  });

  ipcMain.handle('save-settings', (_event, settings: {
    geminiApiKey: string;
    birdAuthToken: string;
    birdCt0: string;
    birdChromeProfile: string;
  }) => {
    const lines = [
      '# Gemini API Key (required for classification)',
      `GEMINI_API_KEY=${settings.geminiApiKey}`,
      '',
      '# Bird CLI authentication (for X/Twitter bookmarks)',
      `BIRD_CHROME_PROFILE=${settings.birdChromeProfile}`,
      `BIRD_AUTH_TOKEN=${settings.birdAuthToken}`,
      `BIRD_CT0=${settings.birdCt0}`,
    ];
    fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
  });

  ipcMain.handle('fetch-bookmarks', async () => {
    const { fetchAndStore } = await import('./pipeline/fetch-and-store');
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    const parse = (key: string): string => {
      const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
      return match ? match[1] : '';
    };
    return fetchAndStore(db, {
      authToken: parse('BIRD_AUTH_TOKEN') || undefined,
      ct0: parse('BIRD_CT0') || undefined,
      chromeProfile: parse('BIRD_CHROME_PROFILE') || undefined,
    });
  });

  ipcMain.handle('classify-and-notify', async () => {
    const { classifyAndNotify } = await import('./pipeline/classify-and-notify');
    const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
    const parse = (key: string): string => {
      const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'));
      return match ? match[1] : '';
    };
    return classifyAndNotify(db, {
      apiKey: parse('GEMINI_API_KEY') || undefined,
    });
  });

  // Start cron scheduler: fetch every 6 hours, then classify
  const cronJob = startCronScheduler(db, '0 */6 * * *');
  app.on('before-quit', () => {
    cronJob.stop();
  });
});
