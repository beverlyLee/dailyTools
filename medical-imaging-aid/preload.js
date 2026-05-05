const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openSmartViewer: () => ipcRenderer.send('open-smart-viewer'),
  openStructuredReport: () => ipcRenderer.send('open-structured-report'),
  onOpenDicom: (callback) => ipcRenderer.on('open-dicom', callback)
});
