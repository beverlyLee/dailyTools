const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
  saveFileDialog: (content, defaultPath) => ipcRenderer.invoke('save-file-dialog', content, defaultPath),
  saveComparison: (data) => ipcRenderer.invoke('save-comparison', data),
  getComparisons: () => ipcRenderer.invoke('get-comparisons'),
  deleteComparison: (id) => ipcRenderer.invoke('delete-comparison', id)
});
