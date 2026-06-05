import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  getClassifications: () => ipcRenderer.invoke('get-classifications'),
  getBookmarkWithClassification: (bookmarkId: string) =>
    ipcRenderer.invoke('get-bookmark-with-classification', bookmarkId),
});
