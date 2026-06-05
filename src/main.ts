import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import Database from 'better-sqlite3';
import { initializeSchema } from './db/schema';
import { getStoredBookmarks } from './db/bookmarks';
import { getClassifiedBookmarks } from './db/classifications';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let db: Database.Database;

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
app.whenReady().then(() => {
  // Initialize SQLite database
  const dbPath = path.join(app.getPath('userData'), 'bookmarks.db');
  db = new Database(dbPath);
  initializeSchema(db);

  // IPC handlers for bookmark data
  ipcMain.handle('get-bookmarks', () => {
    return getStoredBookmarks(db);
  });

  ipcMain.handle('get-classifications', () => {
    return getClassifiedBookmarks(db);
  });

  ipcMain.handle('get-bookmark-with-classification', async (_event, bookmarkId: string) => {
    const { getClassification } = await import('./db/classifications');
    return getClassification(db, bookmarkId);
  });
});
