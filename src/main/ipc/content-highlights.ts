import { type IpcMain } from 'electron';
import type { Client } from '@libsql/client';

export function registerContentHighlightsIpc(ipcMain: IpcMain, db: Client) {
  ipcMain.handle('save-highlight', async (_event, bookmarkId: string, data: { selected_text: string; note: string | null; color: string | null }) => {
    const { createHighlight } = await import('../../db/highlights');
    await createHighlight(db, bookmarkId, data);
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
}
