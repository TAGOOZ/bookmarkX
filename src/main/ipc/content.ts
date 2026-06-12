import { type IpcMain, dialog, app } from 'electron';
import type { Client } from '@libsql/client';
import fs from 'node:fs';
import path from 'node:path';
import { readConfig } from '../../main/user-config';

const cooldowns = new Map<string, number>();
const COOLDOWN_MS = 2000;

function checkCooldown(channel: string): boolean {
  const now = Date.now();
  const last = cooldowns.get(channel) ?? 0;
  if (now - last < COOLDOWN_MS) return false;
  cooldowns.set(channel, now);
  return true;
}

async function getConfigEnv(): Promise<{ apiKey?: string }> {
  const userDataDir = app.getPath('userData');
  const config = await readConfig(userDataDir);
  return { apiKey: config.geminiApiKey || undefined };
}

export function registerContentIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('summarize-bookmark', async (_event, bookmarkId: string) => {
    if (!checkCooldown('summarize-bookmark')) throw new Error('Rate limited — please wait');
    const { summarizeBookmark } = await import('../../services/summarize');
    const { getBookmarkById } = await import('../../db/bookmarks');
    const bookmark = await getBookmarkById(db, bookmarkId);
    if (!bookmark) throw new Error('Bookmark not found');
    const env = await getConfigEnv();
    return summarizeBookmark(db, bookmarkId, bookmark, { apiKey: env.apiKey });
  });

  ipcMain.handle('extract-article', async (_event, bookmarkId: string, url: string) => {
    try {
      const { extractArticle } = await import('../../services/extract');
      const env = await getConfigEnv();
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
    if (!checkCooldown('send-chat-message')) throw new Error('Rate limited — please wait');
    if (typeof message === 'string' && message.length > 10000) {
      throw new Error('Chat message exceeds 10000 character limit');
    }
    const { sendMessage } = await import('../../services/chat');
    const env = await getConfigEnv();
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

  ipcMain.handle('delete-highlight', async (_event, highlightId: string) => {
    const { deleteHighlight } = await import('../../db/highlights');
    await deleteHighlight(db, highlightId);
    return { success: true };
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

  ipcMain.handle('delete-note', async (_event, noteId: string) => {
    const { deleteNote } = await import('../../db/notes');
    await deleteNote(db, noteId);
    return { success: true };
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
    if (!checkCooldown('enhance-note')) throw new Error('Rate limited — please wait');
    if (typeof selectedText === 'string' && selectedText.length > 5000) {
      throw new Error('Text to enhance exceeds 5000 character limit');
    }
    const { enhanceNote } = await import('../../services/enhance');
    const env = await getConfigEnv();
    return enhanceNote(selectedText, context, { apiKey: env.apiKey });
  });

  ipcMain.handle('generate-glossary', async (_event, bookmarkId: string, content: string, title?: string) => {
    if (!checkCooldown('generate-glossary')) throw new Error('Rate limited — please wait');
    if (typeof content === 'string' && content.length > 50000) {
      throw new Error('Glossary content exceeds 50000 character limit');
    }
    const { generateGlossary } = await import('../../services/glossary');
    const { addTerm, linkTermToBookmark } = await import('../../db/glossary');
    const env = await getConfigEnv();
    const terms = await generateGlossary(content, { apiKey: env.apiKey, title });
    for (const t of terms) {
      const termId = await addTerm(db, t.term, t.definition);
      await linkTermToBookmark(db, bookmarkId, termId);
    }
    return terms;
  });

  ipcMain.handle('get-all-glossary-terms', async () => {
    const { getAllTerms } = await import('../../db/glossary');
    return getAllTerms(db);
  });

  ipcMain.handle('delete-glossary-term', async (_event, termId: string) => {
    const { deleteTerm } = await import('../../db/glossary');
    await deleteTerm(db, termId);
    return { success: true };
  });

  ipcMain.handle('export-glossary', async (_event, format: 'md' | 'json', bookmarkId?: string) => {
    if (format === 'md') {
      const { exportGlossaryMarkdown } = await import('../../db/glossary');
      return await exportGlossaryMarkdown(db, bookmarkId);
    } else {
      const { exportGlossaryJson } = await import('../../db/glossary');
      return await exportGlossaryJson(db, bookmarkId);
    }
  });

  ipcMain.handle('get-custom-sections', async (_event, bookmarkId: string) => {
    const { getCustomSections } = await import('../../db/custom-sections');
    return getCustomSections(db, bookmarkId);
  });

  ipcMain.handle('create-custom-section', async (_event, bookmarkId: string, title: string, content?: string) => {
    const { createCustomSection } = await import('../../db/custom-sections');
    return createCustomSection(db, bookmarkId, title, content || '');
  });

  ipcMain.handle('update-custom-section', async (_event, sectionId: string, data: { title?: string; content?: string }) => {
    const { updateCustomSection } = await import('../../db/custom-sections');
    await updateCustomSection(db, sectionId, data);
    return { success: true };
  });

  ipcMain.handle('delete-custom-section', async (_event, sectionId: string) => {
    const { deleteCustomSection } = await import('../../db/custom-sections');
    await deleteCustomSection(db, sectionId);
    return { success: true };
  });

  ipcMain.handle('reorder-custom-sections', async (_event, orderedIds: string[]) => {
    const { reorderCustomSections } = await import('../../db/custom-sections');
    await reorderCustomSections(db, orderedIds);
    return { success: true };
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
