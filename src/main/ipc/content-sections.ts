import { type IpcMain } from 'electron';
import type { Client } from '@libsql/client';

export function registerContentSectionsIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('get-custom-sections', async (_event, bookmarkId: string) => {
    const { getCustomSections } = await import('../../db/custom-sections');
    return getCustomSections(db, bookmarkId);
  });

  ipcMain.handle('create-custom-section', async (_event, bookmarkId: string, title: string, content?: string) => {
    if (typeof title !== 'string' || title.length === 0 || title.length > 500) {
      throw new Error('Custom section title must be between 1 and 500 characters');
    }
    if (typeof content === 'string' && content.length > 50000) {
      throw new Error('Custom section content must not exceed 50000 characters');
    }
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
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new Error('orderedIds must be a non-empty array');
    }
    if (orderedIds.length > 1000) {
      throw new Error('orderedIds must not exceed 1000 items');
    }
    const { reorderCustomSections } = await import('../../db/custom-sections');
    await reorderCustomSections(db, orderedIds);
    return { success: true };
  });
}
