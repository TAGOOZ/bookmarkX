import { app, BrowserWindow, ipcMain, Menu, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import started from 'electron-squirrel-startup';
import { createClient, type Client } from '@libsql/client';
import { readConfig, writeConfig, type UserConfig } from './main/user-config';
import { detectAndExtract } from './main/chrome-profile-detect';

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

function getConfig(): UserConfig {
  const userDataDir = app.getPath('userData');
  return readConfig(userDataDir);
}

function getConfigEnv(): { authToken?: string; ct0?: string; chromeProfile?: string; apiKey?: string } {
  const config = getConfig();
  return {
    authToken: config.birdAuthToken || undefined,
    ct0: config.birdCt0 || undefined,
    chromeProfile: config.birdChromeProfile || undefined,
    apiKey: config.geminiApiKey || undefined,
  };
}

// Register ALL IPC handlers BEFORE any async init so they are always available.
// Handlers that need `db` will use the module-level `db` variable which gets
// set during app.whenReady(). The renderer may call these before db is ready,
// but the handler exists — it will just throw if db isn't initialized yet.

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

ipcMain.handle('get-settings', () => {
  return getConfig();
});

ipcMain.handle('save-settings', (_event, settings: UserConfig) => {
  const userDataDir = app.getPath('userData');
  writeConfig(userDataDir, settings);
});

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
    const checkInterval = setInterval(async () => {
      if (resolved) return;
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
        // Window may have been closed
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

ipcMain.handle('fetch-bookmarks', async () => {
  const { fetchAndStore } = await import('./pipeline/fetch-and-store');
  const env = getConfigEnv();
  return fetchAndStore(db, {
    authToken: env.authToken,
    ct0: env.ct0,
    chromeProfile: env.chromeProfile,
  });
});

ipcMain.handle('classify-and-notify', async () => {
  const { classifyAndNotify } = await import('./pipeline/classify-and-notify');
  const env = getConfigEnv();
  return classifyAndNotify(db, {
    apiKey: env.apiKey,
  });
});

// Phase 2 IPC handlers: Summarize
ipcMain.handle('summarize-bookmark', async (_event, bookmarkId: string) => {
  const { summarizeBookmark } = await import('./services/summarize');
  const { getStoredBookmarks } = await import('./db/bookmarks');
  const bookmarks = await getStoredBookmarks(db);
  const bookmark = bookmarks.find((b) => b.id === bookmarkId);
  if (!bookmark) throw new Error('Bookmark not found');
  const env = getConfigEnv();
  return summarizeBookmark(db, bookmarkId, bookmark, {
    apiKey: env.apiKey,
  });
});

// Phase 2 IPC handlers: Extract article
ipcMain.handle('extract-article', async (_event, bookmarkId: string, url: string) => {
  const { extractArticle } = await import('./services/extract');
  const env = getConfigEnv();
  return extractArticle(db, bookmarkId, url, {
    apiKey: env.apiKey,
  });
});

// Get article content (including blocks_json)
ipcMain.handle('get-article-content', async (_event, bookmarkId: string) => {
  const { getArticleContent } = await import('./db/article-content');
  return getArticleContent(db, bookmarkId);
});

// Phase 2 IPC handlers: Chat
ipcMain.handle('send-chat-message', async (_event, sessionId: string, message: string, articleContext?: string) => {
  const { sendMessage } = await import('./services/chat');
  const env = getConfigEnv();
  return sendMessage(db, sessionId, message, articleContext, {
    apiKey: env.apiKey,
  });
});

// Phase 2 IPC handlers: Highlights
ipcMain.handle('save-highlight', async (_event, bookmarkId: string, data: { selected_text: string; note: string | null; color: string | null }) => {
  const { storeHighlight } = await import('./db/highlights');
  await storeHighlight(db, bookmarkId, data);
  return { success: true };
});

ipcMain.handle('get-highlights', async (_event, bookmarkId: string) => {
  const { getHighlights } = await import('./db/highlights');
  return getHighlights(db, bookmarkId);
});

// Phase 2 IPC handlers: Notes
ipcMain.handle('save-note', async (_event, bookmarkId: string, data: { title: string | null; content: string | null }) => {
  const { storeNote } = await import('./db/notes');
  await storeNote(db, bookmarkId, data);
  return { success: true };
});

ipcMain.handle('get-notes', async (_event, bookmarkId: string) => {
  const { getNotes } = await import('./db/notes');
  return getNotes(db, bookmarkId);
});

// Phase 2 IPC handlers: Glossary
ipcMain.handle('add-glossary-term', async (_event, term: string, definition: string) => {
  const { addTerm } = await import('./db/glossary');
  return addTerm(db, term, definition);
});

ipcMain.handle('search-glossary', async (_event, query: string) => {
  const { searchTerms } = await import('./db/glossary');
  return searchTerms(db, query);
});

// Phase 2 IPC handlers: Enhance note
ipcMain.handle('enhance-note', async (_event, selectedText: string, context?: string) => {
  const { enhanceNote } = await import('./services/enhance');
  const env = getConfigEnv();
  return enhanceNote(selectedText, context, {
    apiKey: env.apiKey,
  });
});

// Phase 2 IPC handlers: Chat sessions
ipcMain.handle('create-chat-session', async (_event, bookmarkId: string) => {
  try {
    const { createChatSession } = await import('./db/chat');
    return await createChatSession(db, bookmarkId);
  } catch (err) {
    console.warn('Failed to create chat session:', err);
    return null;
  }
});

ipcMain.handle('get-chat-messages', async (_event, sessionId: string) => {
  const { getChatMessages } = await import('./db/chat');
  return getChatMessages(db, sessionId);
});

// Phase 2 IPC handlers: Glossary generation
ipcMain.handle('generate-glossary', async (_event, bookmarkId: string, content: string, title?: string) => {
  const { generateGlossary } = await import('./services/glossary');
  const { addTerm, linkTermToBookmark } = await import('./db/glossary');
  const env = getConfigEnv();
  const terms = await generateGlossary(content, {
    apiKey: env.apiKey,
    title,
  });
  for (const t of terms) {
    const termId = await addTerm(db, t.term, t.definition);
    await linkTermToBookmark(db, bookmarkId, termId);
  }
  return terms;
});

// Phase 4 IPC handlers: Full-text search
ipcMain.handle('search-articles', async (_event, query: string, limit?: number) => {
  const { searchArticleContent } = await import('./db/article-content');
  return searchArticleContent(db, query, limit);
});

const createWindow = () => {
  Menu.setApplicationMenu(null);

  const mainWindow = new BrowserWindow({
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

// Initialize database after app is ready (IPC handlers already registered above)
app.whenReady().then(async () => {
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

  // Start cron scheduler: fetch every 6 hours, then classify
  const cronJob = startCronScheduler(db, '0 */6 * * *');
  app.on('before-quit', () => {
    cronJob.stop();
  });
});
