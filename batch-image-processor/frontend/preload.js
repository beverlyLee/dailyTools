const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectSavePath: (defaultPath) => ipcRenderer.invoke('select-save-path', defaultPath),
  
  apiGet: (endpoint, params) => ipcRenderer.invoke('api-get', endpoint, params),
  apiPost: (endpoint, data, config) => ipcRenderer.invoke('api-post', endpoint, data, config),
  apiPut: (endpoint, data) => ipcRenderer.invoke('api-put', endpoint, data),
  apiDelete: (endpoint) => ipcRenderer.invoke('api-delete', endpoint),
  
  getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath)
});
