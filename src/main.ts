import { app, BrowserWindow, Menu, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { createClient, type Client } from '@libsql/client';
import { registerAllIpc } from './main/ipc';
import { initializeSchema } from './db/schema';
import { startCronScheduler } from './scheduler/cron';
import { removePlaintextSecrets } from './main/user-config';

// Disable GPU acceleration on Linux to avoid crashes
// NOTE: --no-sandbox MUST be passed as CLI arg, not appendSwitch (see electron/electron#47650)
// Use: pnpm start:linux
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
  app.commandLine.appendSwitch('in-process-gpu');
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let db: Client;
let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e1e1e',
      symbolColor: '#dadada',
      height: 36,
    },
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
};

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

// Initialize database, register IPC handlers, then create window
app.whenReady().then(async () => {
  // Inject CSP headers
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com; font-src 'self' https://fonts.gstatic.com;",
        ],
      },
    });
  });

  const userDataDir = app.getPath('userData');

  // Delete .env on first launch after update
  const envPath = path.join(app.getAppPath(), '.env');
  if (fs.existsSync(envPath)) {
    fs.unlinkSync(envPath);
  }

  // Initialize SQLite database
  const dbPath = path.join(userDataDir, 'bookmarks.db');
  db = createClient({ url: `file:${dbPath}` });
  await initializeSchema(db);
  await removePlaintextSecrets(userDataDir);

  // Register all IPC handlers (was: 390 lines of inline handlers)
  const { ipcMain } = await import('electron');
  registerAllIpc(ipcMain, db);

  // Start cron scheduler: fetch every 6 hours, then classify
  const cronJob = startCronScheduler(db, '0 */6 * * *');
  app.on('before-quit', () => {
    cronJob.stop();
  });

  // Create window after IPC handlers are ready
  createWindow();
});
