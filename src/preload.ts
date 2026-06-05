import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  getClassifications: () => ipcRenderer.invoke('get-classifications'),
  getBookmarkWithClassification: (bookmarkId: string) =>
    ipcRenderer.invoke('get-bookmark-with-classification', bookmarkId),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: {
    geminiApiKey: string;
    birdAuthToken: string;
    birdCt0: string;
    birdChromeProfile: string;
  }) => ipcRenderer.invoke('save-settings', settings),
  fetchBookmarks: () => ipcRenderer.invoke('fetch-bookmarks'),
  classifyAndNotify: () => ipcRenderer.invoke('classify-and-notify'),
});
