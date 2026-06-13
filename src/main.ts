import { app, BrowserWindow, Menu } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';

// Linux-specific flags for GPU-less systems (Electron 42 compat)
// NOTE: --no-sandbox MUST be passed as CLI arg, not appendSwitch (see electron/electron#47650)
// Use: pnpm start:linux
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-compositing');
  app.commandLine.appendSwitch('disable-dev-shm-usage');
  // in-process-gpu prevents separate GPU process launch which crashes on systems
  // without GPU hardware — GPU runs in the browser process instead
  app.commandLine.appendSwitch('in-process-gpu');
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// electron-squirrel-startup is only relevant on Windows
if (process.platform === 'win32' && started) {
  app.quit();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let db: any;
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

  // Retry page load on failure (e.g., network service crash on startup)
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    if (errorCode !== 0 && errorCode !== -3) {
      console.warn(`Page load failed (${errorCode}: ${errorDescription}), retrying...`);
      setTimeout(() => {
        if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
          mainWindow?.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
        }
      }, 1500);
    }
  });
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
  // CSP is applied via <meta> tag in index.html (avoids network service crash on Electron 42/Linux with session.webRequest)

  const userDataDir = app.getPath('userData');

  // Initialize SQLite database with error handling
  let dbInitialized = false;
  try {
    const { createClient } = await import('@libsql/client');
    const dbPath = path.join(userDataDir, 'bookmarks.db');
    db = createClient({ url: `file:${dbPath}` });
    dbInitialized = true;
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }

  if (dbInitialized) {
    // Lazy-load schema and IPC modules
    try {
      const [{ initializeSchema }, { registerAllIpc }] =
        await Promise.all([
          import('./db/schema'),
          import('./main/ipc'),
        ]);

      await initializeSchema(db);

      // Register all IPC handlers
      const { ipcMain } = await import('electron');
      registerAllIpc(ipcMain, db);
    } catch (err) {
      console.error('Failed to initialize app modules:', err);
    }
  }

  // Create window first for faster perceived startup
  createWindow();

  // Background cleanup: remove plaintext secrets from config (one-time migration)
  if (dbInitialized) {
    import('./main/user-config').then(({ removePlaintextSecrets }) => {
      removePlaintextSecrets(userDataDir).catch((err) => {
        console.error('Failed to remove plaintext secrets:', err);
      });
    }).catch((err) => {
      console.error('Failed to import user-config:', err);
    });

    // Start cron scheduler in background (first run is 6 hours away)
    import('./scheduler/cron').then(({ startCronScheduler }) => {
      try {
        const cronJob = startCronScheduler(db, '0 */6 * * *');
        app.on('before-quit', () => {
          cronJob.stop();
        });
      } catch (err) {
        console.error('Failed to start cron scheduler:', err);
      }
    }).catch((err) => {
      console.error('Failed to import cron scheduler:', err);
    });
  }
}).catch((err) => {
  console.error('Fatal startup error:', err);
  // Still attempt to create window so user sees something
  try { createWindow(); } catch { /* ignore */ }
});
