const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  saveFileDialog: (content, defaultPath) => ipcRenderer.invoke('save-file-dialog', content, defaultPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  listDirectory: (dirPath) => ipcRenderer.invoke('list-directory', dirPath),
  backendRequest: (method, endpoint, data) => ipcRenderer.invoke('backend-request', method, endpoint, data),
  showMessage: (type, title, message, detail) => ipcRenderer.invoke('show-message', type, title, message, detail),
  showConfirm: (title, message, detail) => ipcRenderer.invoke('show-confirm', title, message, detail),
  
  onMenuOpenFile: (callback) => {
    ipcRenderer.on('menu-open-file', callback);
    return () => ipcRenderer.removeListener('menu-open-file', callback);
  },
  onMenuSaveFile: (callback) => {
    ipcRenderer.on('menu-save-file', callback);
    return () => ipcRenderer.removeListener('menu-save-file', callback);
  },
  onSwitchTab: (callback) => {
    ipcRenderer.on('switch-tab', (event, tabName) => callback(tabName));
    return () => ipcRenderer.removeListener('switch-tab', callback);
  }
});
