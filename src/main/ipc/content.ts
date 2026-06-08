import { type IpcMain, dialog } from 'electron';
import type { Client } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';

function getConfigEnv(): { apiKey?: string } {
  const { readConfig } = require('../../main/user-config');
  const { app } = require('electron');
  const userDataDir = app.getPath('userData');
  const config = readConfig(userDataDir);
  return { apiKey: config.geminiApiKey || undefined };
}

export function registerContentIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('summarize-bookmark', async (_event, bookmarkId: string) => {
    const { summarizeBookmark } = await import('../../services/summarize');
    const { getStoredBookmarks } = await import('../../db/bookmarks');
    const bookmarks = await getStoredBookmarks(db);
    const bookmark = bookmarks.find((b) => b.id === bookmarkId);
    if (!bookmark) throw new Error('Bookmark not found');
    const env = getConfigEnv();
    return summarizeBookmark(db, bookmarkId, bookmark, { apiKey: env.apiKey });
  });

  ipcMain.handle('extract-article', async (_event, bookmarkId: string, url: string) => {
    try {
      const { extractArticle } = await import('../../services/extract');
      const env = getConfigEnv();
      return await extractArticle(db, bookmarkId, url, { apiKey: env.apiKey });
    } catch (err) {
      console.error('extract-article failed:', err);
      throw err;
    }
  });

  ipcMain.handle('get-article-content', async (_event, bookmarkId: string) => {
    const { getArticleContent } = await import('../../db/article-content');
    return getArticleContent(db, bookmarkId);
  });

  ipcMain.handle('send-chat-message', async (_event, sessionId: string, message: string, articleContext?: string) => {
    const { sendMessage } = await import('../../services/chat');
    const env = getConfigEnv();
    return sendMessage(db, sessionId, message, articleContext, { apiKey: env.apiKey });
  });

  ipcMain.handle('create-chat-session', async (_event, bookmarkId: string) => {
    try {
      const { createChatSession } = await import('../../db/chat');
      return await createChatSession(db, bookmarkId);
    } catch (err) {
      console.warn('Failed to create chat session:', err);
      return null;
    }
  });

  ipcMain.handle('get-chat-messages', async (_event, sessionId: string) => {
    const { getChatMessages } = await import('../../db/chat');
    return getChatMessages(db, sessionId);
  });

  ipcMain.handle('save-highlight', async (_event, bookmarkId: string, data: { selected_text: string; note: string | null; color: string | null }) => {
    const { storeHighlight } = await import('../../db/highlights');
    await storeHighlight(db, bookmarkId, data);
    return { success: true };
  });

  ipcMain.handle('get-highlights', async (_event, bookmarkId: string) => {
    const { getHighlights } = await import('../../db/highlights');
    return getHighlights(db, bookmarkId);
  });

  ipcMain.handle('save-note', async (_event, bookmarkId: string, data: { title: string | null; content: string | null }) => {
    const { storeNote } = await import('../../db/notes');
    await storeNote(db, bookmarkId, data);
    return { success: true };
  });

  ipcMain.handle('get-notes', async (_event, bookmarkId: string) => {
    const { getNotes } = await import('../../db/notes');
    return getNotes(db, bookmarkId);
  });

  ipcMain.handle('add-glossary-term', async (_event, term: string, definition: string) => {
    const { addTerm } = await import('../../db/glossary');
    return addTerm(db, term, definition);
  });

  ipcMain.handle('search-glossary', async (_event, query: string) => {
    const { searchTerms } = await import('../../db/glossary');
    return searchTerms(db, query);
  });

  ipcMain.handle('enhance-note', async (_event, selectedText: string, context?: string) => {
    const { enhanceNote } = await import('../../services/enhance');
    const env = getConfigEnv();
    return enhanceNote(selectedText, context, { apiKey: env.apiKey });
  });

  ipcMain.handle('generate-glossary', async (_event, bookmarkId: string, content: string, title?: string) => {
    const { generateGlossary } = await import('../../services/glossary');
    const { addTerm, linkTermToBookmark } = await import('../../db/glossary');
    const env = getConfigEnv();
    const terms = await generateGlossary(content, { apiKey: env.apiKey, title });
    for (const t of terms) {
      const termId = await addTerm(db, t.term, t.definition);
      await linkTermToBookmark(db, bookmarkId, termId);
    }
    return terms;
  });

  ipcMain.handle('export-bookmark', async (_event, format: 'md' | 'json', content: string, defaultName: string) => {
    const ext = format === 'md' ? '.md' : '.json';
    const filterName = format === 'md' ? 'Markdown' : 'JSON';
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName.endsWith(ext) ? defaultName : `${defaultName}${ext}`,
      filters: [{ name: filterName, extensions: [format] }],
    });
    if (result.canceled || !result.filePath) return { cancelled: true };
    await fs.promises.writeFile(result.filePath, content, 'utf-8');
    return { success: true, path: result.filePath };
  });

  ipcMain.handle('import-markdown', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return { cancelled: true };
    const content = await fs.promises.readFile(result.filePaths[0], 'utf-8');
    const fileName = path.basename(result.filePaths[0]);
    return { content, fileName };
  });

  ipcMain.handle('search-articles', async (_event, query: string, limit?: number) => {
    if (!query || query.trim().length < 2) return [];
    try {
      const { searchArticleContent } = await import('../../db/article-content');
      return await searchArticleContent(db, query, limit);
    } catch (err) {
      console.error('search-articles error:', err);
      return [];
    }
  });
}
