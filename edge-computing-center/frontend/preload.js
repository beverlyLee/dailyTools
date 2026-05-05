const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  executeSSH: (options) => ipcRenderer.invoke('execute-ssh', options),
  pingNode: (ip) => ipcRenderer.invoke('ping-node', ip),
});
