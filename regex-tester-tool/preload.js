const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAllPatterns: () => ipcRenderer.invoke('get-all-patterns'),
  addPattern: (pattern) => ipcRenderer.invoke('add-pattern', pattern),
  updatePattern: (pattern) => ipcRenderer.invoke('update-pattern', pattern),
  deletePattern: (id) => ipcRenderer.invoke('delete-pattern', id),
  getPatternById: (id) => ipcRenderer.invoke('get-pattern-by-id', id)
});
