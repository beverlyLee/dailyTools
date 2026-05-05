const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  onHardwareData: (callback) => ipcRenderer.on('hardware-data', callback),
  sendToHardware: (data) => ipcRenderer.send('send-to-hardware', data)
})
