const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  saveFileDialog: (content, defaultPath, options) => ipcRenderer.invoke('save-file-dialog', content, defaultPath, options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),
  getApiBaseUrl: () => ipcRenderer.invoke('get-api-base-url')
});
