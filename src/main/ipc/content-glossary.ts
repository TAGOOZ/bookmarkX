import { type IpcMain } from 'electron';
import type { Client } from '@libsql/client';
import { checkCooldown, getConfigEnv } from './ipc-helpers';

export function registerContentGlossaryIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('add-glossary-term', async (_event, term: string, definition: string) => {
    if (typeof term !== 'string' || term.length === 0 || term.length > 500) {
      throw new Error('Glossary term must be between 1 and 500 characters');
    }
    if (typeof definition !== 'string' || definition.length > 5000) {
      throw new Error('Glossary definition must not exceed 5000 characters');
    }
    const { addTerm } = await import('../../db/glossary');
    return addTerm(db, term, definition);
  });

  ipcMain.handle('search-glossary', async (_event, query: string) => {
    const { searchTerms } = await import('../../db/glossary');
    return searchTerms(db, query);
  });

  ipcMain.handle('generate-glossary', async (_event, bookmarkId: string, content: string, title?: string) => {
    if (!checkCooldown('generate-glossary')) throw new Error('Rate limited — please wait');
    if (typeof content === 'string' && content.length > 50000) {
      throw new Error('Glossary content exceeds 50000 character limit');
    }
    const { generateGlossary } = await import('../../services/glossary');
    const { batchAddTermsAndLink } = await import('../../db/glossary');
    const env = await getConfigEnv();
    const terms = await generateGlossary(content, { apiKey: env.apiKey, title });
    await batchAddTermsAndLink(db, bookmarkId, terms);
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
}
