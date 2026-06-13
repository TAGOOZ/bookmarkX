import { type IpcMain, dialog } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export function registerContentIoIpc(ipcMain: IpcMain) {
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
}
