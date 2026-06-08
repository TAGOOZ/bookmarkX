import { type IpcMain, app } from 'electron';
import { readConfig, writeConfig, type UserConfig } from '../../main/user-config';

export function registerSettingsIpc(ipcMain: IpcMain) {
  ipcMain.handle('get-settings', () => {
    const userDataDir = app.getPath('userData');
    return readConfig(userDataDir);
  });

  ipcMain.handle('save-settings', (_event, settings: UserConfig) => {
    const userDataDir = app.getPath('userData');
    writeConfig(userDataDir, settings);
  });
}
