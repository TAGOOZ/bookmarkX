import { type IpcMain, app } from 'electron';
import { readConfig, writeConfig, type UserConfig } from '../../main/user-config';
import { invalidateConfigCache } from './content';

export function registerSettingsIpc(ipcMain: IpcMain) {
  ipcMain.handle('get-settings', async () => {
    const userDataDir = app.getPath('userData');
    return readConfig(userDataDir);
  });

  ipcMain.handle('save-settings', async (_event, settings: UserConfig) => {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Invalid settings: expected an object');
    }
    if (typeof settings.name !== 'string') {
      throw new Error('Invalid settings: name is required');
    }
    if (!['ar', 'en'].includes(settings.language)) {
      throw new Error('Invalid settings: language must be "ar" or "en"');
    }
    const userDataDir = app.getPath('userData');
    await writeConfig(userDataDir, settings);
    invalidateConfigCache();
  });
}
